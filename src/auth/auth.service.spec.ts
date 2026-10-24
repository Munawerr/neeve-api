import { describe, it, expect, jest, afterEach } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';

const anyFn = () => jest.fn<(args?: any) => any>();

const ORIGINAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

afterEach(() => {
  if (ORIGINAL_ADMIN_PASSWORD === undefined) {
    delete process.env.ADMIN_PASSWORD;
  } else {
    process.env.ADMIN_PASSWORD = ORIGINAL_ADMIN_PASSWORD;
  }
});

describe('AuthService - env ADMIN_PASSWORD fallback', () => {
  const buildUser = (overrides?: any) => {
    const doc: any = {
      _id: new Types.ObjectId(),
      email: 'admin@neeve.io',
      password: bcrypt.hashSync('userpass', 4),
      full_name: 'Admin User',
      status: 'active',
      role: { slug: 'admin' },
      ...overrides,
    };
    return {
      ...doc,
      toObject: () => {
        const { toObject, ...rest } = doc;
        return { ...rest };
      },
    };
  };

  const makeService = (user: any) => {
    const usersService = {
      findByEmail: anyFn().mockResolvedValue(user),
      findByRegNo: anyFn().mockResolvedValue(null),
      findByPhone: anyFn().mockResolvedValue(null),
      updateProfile: anyFn().mockResolvedValue(undefined),
    };
    const loginHistoryService = {
      logSuccessfulLogin: anyFn().mockResolvedValue(undefined),
    };
    return new AuthService(
      usersService as any,
      {} as any,
      {} as any,
      loginHistoryService as any,
    );
  };

  it('validates the admin with their own (updated) password', async () => {
    process.env.ADMIN_PASSWORD = 'masterpass';
    const user = buildUser();
    const service = makeService(user);
    await expect(
      service.validateUserWithRequest('admin@neeve.io', 'userpass', {} as any),
    ).resolves.toBe(user);
  });

  it('allows the env ADMIN_PASSWORD when the stored password is wrong', async () => {
    process.env.ADMIN_PASSWORD = 'masterpass';
    const user = buildUser();
    const service = makeService(user);
    await expect(
      service.validateUserWithRequest(
        'admin@neeve.io',
        'masterpass',
        {} as any,
      ),
    ).resolves.toBe(user);
  });

  it('rejects wrong passwords when ADMIN_PASSWORD is not configured', async () => {
    delete process.env.ADMIN_PASSWORD;
    const user = buildUser();
    const service = makeService(user);
    await expect(
      service.validateUserWithRequest('admin@neeve.io', 'wrong', {} as any),
    ).resolves.toBeNull();
  });

  it('does not apply the env password to non-admin roles', async () => {
    process.env.ADMIN_PASSWORD = 'masterpass';
    const user = buildUser({ role: { slug: 'institute' } });
    const service = makeService(user);
    await expect(
      service.validateUserWithRequest(
        'admin@neeve.io',
        'masterpass',
        {} as any,
      ),
    ).resolves.toBeNull();
  });

  it('does not treat the env password as the user stored password via validateUser', async () => {
    process.env.ADMIN_PASSWORD = 'masterpass';
    const user = buildUser({ role: { slug: 'institute' } });
    const service = makeService(user);
    await expect(
      service.validateUser('admin@neeve.io', 'masterpass'),
    ).resolves.toBeNull();
  });

  it('validateUser also accepts the env password for admins', async () => {
    process.env.ADMIN_PASSWORD = 'masterpass';
    const user = buildUser();
    const service = makeService(user);
    await expect(
      service.validateUser('admin@neeve.io', 'masterpass'),
    ).resolves.toBe(user);
  });

  it('rejects when the stored password does not match anything', async () => {
    process.env.ADMIN_PASSWORD = 'masterpass';
    const user = buildUser();
    const service = makeService(user);
    await expect(
      service.validateUser('admin@neeve.io', 'wrong'),
    ).resolves.toBeNull();
  });
});
