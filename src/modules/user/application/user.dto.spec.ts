import 'reflect-metadata';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';
import { UserQueryDto } from './user-query.dto';

const check = <T extends object>(dto: ClassConstructor<T>, body: unknown) =>
  validate(plainToInstance(dto, body), { whitelist: true, forbidNonWhitelisted: true });

describe('user DTOs', () => {
  it('UpdateUserDto accepts partial updates and normalizes them', async () => {
    expect(await check(UpdateUserDto, { name: 'Ana M. Lopez' })).toHaveLength(0);
    expect(await check(UpdateUserDto, { username: 'ana.m' })).toHaveLength(0);
    expect(plainToInstance(UpdateUserDto, { username: ' ANA.M ' }).username).toBe('ana.m');
  });

  it.each([
    ['a password (changed in its own endpoint)', { password: 'x'.repeat(20) }],
    ['an unknown field', { role: 'admin' }],
    ['an invalid username', { username: 'no spaces' }],
    ['a short name', { name: 'A' }],
  ])('UpdateUserDto rejects %s', async (_label, body) => {
    expect((await check(UpdateUserDto, body)).length).toBeGreaterThan(0);
  });

  it('UserQueryDto validates pagination and search', async () => {
    expect(await check(UserQueryDto, { search: 'ana', page: '2', pageSize: '5' })).toHaveLength(0);
    expect((await check(UserQueryDto, { pageSize: '500' })).length).toBeGreaterThan(0);
  });
});
