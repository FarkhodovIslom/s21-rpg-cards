import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../common/prisma.service.js';
import { encrypt, decrypt } from '../common/crypto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async login(username: string, password: string): Promise<{ userId: string }> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const realm = this.configService.get<string>('KEYCLOAK_REALM');
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const encryptionKey = this.configService.get<string>(
      'TOKEN_ENCRYPTION_KEY',
    );

    if (!keycloakUrl || !realm || !clientId || !encryptionKey) {
      throw new Error('Missing Keycloak or encryption configuration');
    }

    const url = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      scope: 'openid offline_access',
      username,
      password,
    });

    let data: {
      access_token: string;
      refresh_token: string;
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          refresh_token: string;
        }>(url, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      data = response.data;
    } catch {
      throw new UnauthorizedException('Invalid login or password');
    }

    const { refresh_token } = data;

    const encryptedRefreshToken = encrypt(refresh_token, encryptionKey);

    const user = await this.prisma.user.upsert({
      where: { login: username },
      update: { encryptedRefreshToken },
      create: {
        login: username,
        encryptedRefreshToken,
      },
    });

    return { userId: user.id };
  }

  async refreshUserToken(userId: string): Promise<{ access_token: string }> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const realm = this.configService.get<string>('KEYCLOAK_REALM');
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const encryptionKey = this.configService.get<string>(
      'TOKEN_ENCRYPTION_KEY',
    );

    if (!keycloakUrl || !realm || !clientId || !encryptionKey) {
      throw new Error('Missing Keycloak or encryption configuration');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const refreshToken = decrypt(user.encryptedRefreshToken, encryptionKey);

    const url = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    let data: {
      access_token: string;
      refresh_token: string;
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          refresh_token: string;
        }>(url, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      data = response.data;
    } catch {
      throw new UnauthorizedException('Session expired');
    }

    const newEncryptedRefreshToken = encrypt(data.refresh_token, encryptionKey);

    await this.prisma.user.update({
      where: { id: userId },
      data: { encryptedRefreshToken: newEncryptedRefreshToken },
    });

    return { access_token: data.access_token };
  }
}
