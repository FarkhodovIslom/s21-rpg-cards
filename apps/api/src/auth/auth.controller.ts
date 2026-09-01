import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { login: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const { userId } = await this.authService.login(body.login, body.password);

    const secret = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');
    const signature = createHmac('sha256', secret!)
      .update(userId)
      .digest('hex');
    const cookieValue = `${userId}.${signature}`;

    res.cookie('session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true };
  }
}
