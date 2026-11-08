import { createHash } from 'crypto';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { PwnedPasswordChecker } from './pwned-password-checker';

const sha1 = (value: string) => createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();

describe('PwnedPasswordChecker (against a local mock of the range API)', () => {
  let server: Server;
  let baseUrl: string;
  let seen: Array<{ url: string; padding: string | undefined }>;
  let respond: (url: string) => { status: number; body: string; delayMs?: number };

  beforeEach(async () => {
    seen = [];
    respond = () => ({ status: 200, body: '' });
    server = createServer((req, res) => {
      seen.push({ url: req.url ?? '', padding: req.headers['add-padding'] as string | undefined });
      const { status, body, delayMs } = respond(req.url ?? '');
      setTimeout(() => {
        res.writeHead(status, { 'Content-Type': 'text/plain' });
        res.end(body);
      }, delayMs ?? 0);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('sends only the first 5 characters of the SHA-1, never the password or the full hash', async () => {
    const password = 'my secret passphrase';
    const digest = sha1(password);

    await new PwnedPasswordChecker({ baseUrl }).isBreached(password);

    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe(`/range/${digest.slice(0, 5)}`);
    expect(seen[0].url).not.toContain(digest.slice(5));
    expect(seen[0].url).not.toContain(encodeURIComponent(password));
    expect(seen[0].padding).toBe('true');
  });

  it('is breached when the suffix is listed with a positive count', async () => {
    const digest = sha1('hunter2 is not secret');
    respond = () => ({ status: 200, body: `0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n${digest.slice(5)}:15\r\n011053FD0102E94D6AE2F8B83D76FAF94F6:1` });

    await expect(new PwnedPasswordChecker({ baseUrl }).isBreached('hunter2 is not secret')).resolves.toBe(true);
  });

  it('ignores padding entries, which are listed with a count of 0', async () => {
    const digest = sha1('a padded response');
    respond = () => ({ status: 200, body: `${digest.slice(5)}:0\r\n1D2DA4053E34E76F6576ED1DA63134B5E2A:0` });

    await expect(new PwnedPasswordChecker({ baseUrl }).isBreached('a padded response')).resolves.toBe(false);
  });

  it('is not breached when the suffix is absent', async () => {
    respond = () => ({ status: 200, body: '0018A45C4D1DEF81644B54AB7F969B88D65:3' });

    await expect(new PwnedPasswordChecker({ baseUrl }).isBreached('not listed anywhere')).resolves.toBe(false);
  });

  it('fails open when the service answers with an error', async () => {
    respond = () => ({ status: 503, body: 'down' });

    await expect(new PwnedPasswordChecker({ baseUrl }).isBreached('anything')).resolves.toBe(false);
  });

  it('fails open when the service is too slow', async () => {
    respond = () => ({ status: 200, body: '', delayMs: 500 });

    await expect(new PwnedPasswordChecker({ baseUrl, timeoutMs: 100 }).isBreached('anything')).resolves.toBe(false);
  });

  it('fails open when the service cannot be reached', async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await expect(new PwnedPasswordChecker({ baseUrl, timeoutMs: 500 }).isBreached('anything')).resolves.toBe(false);
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });
});
