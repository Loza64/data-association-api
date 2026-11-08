import { createHash } from 'crypto';
import { authLog } from '../../../../shared/logger/logger';
import { BreachedPasswordChecker } from '../../domain/breached-password-checker';

export interface PwnedPasswordCheckerOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class PwnedPasswordChecker implements BreachedPasswordChecker {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor({ baseUrl = 'https://api.pwnedpasswords.com', timeoutMs = 2000 }: PwnedPasswordCheckerOptions = {}) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async isBreached(password: string): Promise<boolean> {
    const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);

    try {
      const response = await fetch(`${this.baseUrl}/range/${prefix}`, {
        headers: { 'Add-Padding': 'true', Accept: 'text/plain' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        authLog('Breached password check skipped: provider answered %d', response.status);
        return false;
      }

      return (await response.text()).split('\n').some((line) => {
        const [candidate, count] = line.trim().split(':');
        return candidate === suffix && Number(count) > 0;
      });
    } catch (err) {
      authLog('Breached password check skipped: %s', err instanceof Error ? err.name : 'unknown error');
      return false;
    }
  }
}
