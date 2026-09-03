import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { School21Module } from '../school21/school21.module.js';
import { BrowseController } from './browse.controller.js';
import { BrowseService } from './browse.service.js';

@Module({
  imports: [AuthModule, School21Module],
  controllers: [BrowseController],
  providers: [BrowseService],
})
export class BrowseModule {}
