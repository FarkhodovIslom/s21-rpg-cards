import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { SyncService } from './sync.service.js';
import type { SyncResult } from './sync.service.js';

// Dev-only manual trigger so the sync pipeline can be exercised without
// waiting for the cron tick (also the basis for CP6 loading states).
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('run')
  async run(
    @Body() body: { force?: boolean },
  ): Promise<{ results: SyncResult[] }> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Manual sync is disabled in production');
    }
    return { results: await this.syncService.runOnce(body?.force === true) };
  }
}
