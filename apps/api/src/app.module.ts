import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module.js';
import { CardModule } from './card/card.module.js';
import { ParticipantsModule } from './participants/participants.module.js';
import { BrowseModule } from './browse/browse.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    ScheduleModule.forRoot(),
    AuthModule,
    SyncModule,
    CardModule,
    ParticipantsModule,
    BrowseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
