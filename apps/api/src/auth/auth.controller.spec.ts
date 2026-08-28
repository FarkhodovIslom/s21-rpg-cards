import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn().mockResolvedValue({ userId: 'user-123' }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        TOKEN_ENCRYPTION_KEY:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call AuthService.login and return { success: true }', async () => {
    const mockRes = {
      cookie: jest.fn(),
    };

    const result = await controller.login(
      { login: 'testuser', password: 'testpass' },
      mockRes as any,
    );

    expect(authService.login).toHaveBeenCalledWith('testuser', 'testpass');
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it('should set httpOnly session cookie with signed userId', async () => {
    const mockRes = {
      cookie: jest.fn(),
    };

    await controller.login(
      { login: 'testuser', password: 'testpass' },
      mockRes as any,
    );

    expect(mockRes.cookie).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue, options] = mockRes.cookie.mock.calls[0];

    expect(cookieName).toBe('session');

    // cookie value should be userId.signature format
    const [userId, signature] = cookieValue.split('.');
    expect(userId).toBe('user-123');
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // sha256 hex

    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('should NOT expose tokens in response', async () => {
    const mockRes = {
      cookie: jest.fn(),
    };

    const result = await controller.login(
      { login: 'testuser', password: 'testpass' },
      mockRes as any,
    );

    expect(result).not.toHaveProperty('access_token');
    expect(result).not.toHaveProperty('refresh_token');
  });
});
