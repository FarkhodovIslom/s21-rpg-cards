import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { School21ClientService } from './school21-client.service.js';

@Module({
  imports: [HttpModule],
  providers: [School21ClientService],
  exports: [School21ClientService],
})
export class School21Module {}
