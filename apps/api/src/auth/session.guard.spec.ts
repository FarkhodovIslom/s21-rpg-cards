import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { SessionGuard, requireUserId } from './session.guard.js';
import type { AuthenticatedRequest } from './session.guard.js';

const SECRET =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function makeContext(cookieHeader?: string) {
  const request = {
    headers: cookieHeader === undefined ? {} : { cookie: cookieHeader },
  } as unknown as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function sign(userId: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(userId).digest('hex');
}

describe('SessionGuard', () => {
  const makeGuard = () =>
    new SessionGuard({ get: () => SECRET } as unknown as ConfigService);

  it('accepts a valid session cookie and attaches the user id', () => {
    const { context, request } = makeContext(
      `other=x; session=user-1.${sign('user-1')}`,
    );

    expect(makeGuard().canActivate(context)).toBe(true);
    expect(request.userId).toBe('user-1');
  });

  it('rejects a request without a cookie header', () => {
    const { context } = makeContext();

    expect(() => makeGuard().canActivate(context)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a tampered signature and leaves userId unset', () => {
    const { context, request } = makeContext(
      `session=user-1.${sign('user-1')}ff`,
    );

    expect(() => makeGuard().canActivate(context)).toThrow(
      UnauthorizedException,
    );
    expect(request.userId).toBeUndefined();
  });

  it('rejects a signature produced with a different secret', () => {
    const { context } = makeContext(
      `session=user-1.${sign('user-1', 'another-secret')}`,
    );

    expect(() => makeGuard().canActivate(context)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a malformed cookie value without a separator', () => {
    const { context } = makeContext('session=nodothere');

    expect(() => makeGuard().canActivate(context)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects the request when the secret is not configured', () => {
    const guard = new SessionGuard({
      get: () => undefined,
    } as unknown as ConfigService);
    const { context } = makeContext(`session=user-1.${sign('user-1')}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

describe('requireUserId', () => {
  it('returns the user id when it is present', () => {
    expect(requireUserId({ userId: 'user-1' } as AuthenticatedRequest)).toBe(
      'user-1',
    );
  });

  it('throws when the user id is missing', () => {
    expect(() => requireUserId({} as AuthenticatedRequest)).toThrow(
      UnauthorizedException,
    );
  });
});
