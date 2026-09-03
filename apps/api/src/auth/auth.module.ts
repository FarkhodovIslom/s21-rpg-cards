import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { SessionGuard } from './session.guard.js';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, SessionGuard],
  exports: [AuthService, PrismaService, SessionGuard],
})
export class AuthModule {}
