import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('verifies a matching password against its hash', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(
      verifyPassword('correct horse battery staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('salts each hash differently, even for the same password', async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword('same password'),
      hashPassword('same password'),
    ]);

    expect(hashA).not.toBe(hashB);
    await expect(verifyPassword('same password', hashA)).resolves.toBe(true);
    await expect(verifyPassword('same password', hashB)).resolves.toBe(true);
  });
});
