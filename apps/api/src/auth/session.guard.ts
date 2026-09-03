import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

const COOKIE_NAME = 'session';

// Verifies the httpOnly session cookie issued by POST /auth/login:
// value is `${userId}.${HMAC_SHA256(userId, TOKEN_ENCRYPTION_KEY)}`.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieHeader = request.headers.cookie;
    if (typeof cookieHeader !== 'string') {
      throw new UnauthorizedException('Missing session cookie');
    }

    let sessionValue: string | undefined;
    for (const rawCookie of cookieHeader.split(';')) {
      const cookie = rawCookie.trim();
      if (cookie.startsWith(COOKIE_NAME + '=')) {
        sessionValue = cookie.slice(COOKIE_NAME.length + 1);
        break;
      }
    }
    if (!sessionValue) {
      throw new UnauthorizedException('Missing session cookie');
    }

    const separator = sessionValue.indexOf('.');
    if (separator <= 0 || separator === sessionValue.length - 1) {
      throw new UnauthorizedException('Invalid session cookie');
    }
    const userId = sessionValue.slice(0, separator);
    const signature = sessionValue.slice(separator + 1);

    const secret = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!secret) {
      throw new UnauthorizedException('Session verification is not configured');
    }
    const expected = createHmac('sha256', secret).update(userId).digest('hex');

    const provided = Buffer.from(signature, 'utf8');
    const control = Buffer.from(expected, 'utf8');
    if (
      provided.length !== control.length ||
      !timingSafeEqual(provided, control)
    ) {
      throw new UnauthorizedException('Invalid session cookie');
    }

    request.userId = userId;
    return true;
  }
}

// Controllers behind SessionGuard use this instead of a non-null assertion.
export function requireUserId(request: AuthenticatedRequest): string {
  if (!request.userId) {
    throw new UnauthorizedException('Session user is missing');
  }
  return request.userId;
}
