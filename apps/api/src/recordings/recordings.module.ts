import { Module } from '@nestjs/common';
import { MeetingsModule } from '../meetings/meetings.module';
import { MeetingOwnerGuard } from './meeting-owner.guard';
import { RecordingsController } from './recordings.controller';
import { RecordingsRepository } from './recordings.repository';
import { RecordingsService } from './recordings.service';
import { RecordingsStorage } from './recordings.storage';

@Module({
  imports: [MeetingsModule],
  controllers: [RecordingsController],
  providers: [
    RecordingsService,
    RecordingsRepository,
    RecordingsStorage,
    MeetingOwnerGuard,
  ],
})
export class RecordingsModule {}
