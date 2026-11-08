import { BreachedPasswordChecker } from './breached-password-checker';
import { PasswordPolicy, isPredictable } from './password-policy';

const context = { username: 'ana.lopez', name: 'Ana Maria Lopez' };

describe('isPredictable', () => {
  it.each([
    'aaaaaaaaaaaaaaaa',
    'abababababababab',
    'abcabcabcabcabcabc',
    '1234567890123456',
    '123456789',
    'abcdefghijklmnop',
    'zyxwvutsrqponm',
    '9876543210',
    'qwertyuiopasdf'.slice(0, 10),
    'poiuytrewq',
  ])('flags %s', (value) => {
    expect(isPredictable(value)).toBe(true);
  });

  it.each(['correct horse battery staple', 'Tr0ub4dor&3-and-more', 'mi perro se llama Rocky 2020', 'ñandú-azul-17-lluvia'])(
    'accepts %s',
    (value) => {
      expect(isPredictable(value.toLowerCase())).toBe(false);
    },
  );
});

describe('PasswordPolicy', () => {
  const policy = new PasswordPolicy();

  it('accepts a long passphrase with spaces and unicode, with no composition rules', async () => {
    await expect(policy.assertAcceptable('el perro de mi vecino ladra mucho', context)).resolves.toBeUndefined();
    await expect(policy.assertAcceptable('ñandú azul lluvia tormenta nube', context)).resolves.toBeUndefined();
    await expect(policy.assertAcceptable('alllowercaseandnospacesbutlong', context)).resolves.toBeUndefined();
  });

  it.each([
    ['a common password', 'passwordpassword'],
    ['a common password in another case', 'PasswordPassword'],
    ['a repetition', 'xyxyxyxyxyxyxyxy'],
    ['a digit sequence', '1234567890123456'],
    ['a keyboard run', 'qwertyuiop'],
  ])('400: %s', async (_label, password) => {
    await expect(policy.assertAcceptable(password, context)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('400 when it contains the username or a part of the name, in any case', async () => {
    await expect(policy.assertAcceptable('mi clave es ANA.LOPEZ siempre', context)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('nombre'),
    });
    await expect(policy.assertAcceptable('maria-y-el-mar-azul-profundo', context)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('does not treat very short usernames or name parts as personal data', async () => {
    await expect(policy.assertAcceptable('bicicleta roja y viento fuerte', { username: 'al', name: 'Al Li' })).resolves.toBeUndefined();
  });

  describe('with a breached password checker', () => {
    const checker = { isBreached: jest.fn() } as unknown as jest.Mocked<BreachedPasswordChecker>;
    const withChecker = new PasswordPolicy(checker);

    beforeEach(() => jest.resetAllMocks());

    it('400 when the password appears in known breaches', async () => {
      checker.isBreached.mockResolvedValue(true);

      await expect(withChecker.assertAcceptable('una frase larga y distinta 2026', context)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('filtraciones'),
      });
      expect(checker.isBreached).toHaveBeenCalledWith('una frase larga y distinta 2026');
    });

    it('accepts it when it is not breached', async () => {
      checker.isBreached.mockResolvedValue(false);

      await expect(withChecker.assertAcceptable('una frase larga y distinta 2026', context)).resolves.toBeUndefined();
    });

    it('does not call the external service for passwords already rejected locally', async () => {
      await expect(withChecker.assertAcceptable('passwordpassword', context)).rejects.toMatchObject({ statusCode: 400 });
      expect(checker.isBreached).not.toHaveBeenCalled();
    });
  });
});
