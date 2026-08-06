import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MeetingsModule } from './meetings/meetings.module';
import { RecordingsModule } from './recordings/recordings.module';

@Module({
  imports: [AuthModule, MeetingsModule, RecordingsModule],
})
export class AppModule {}
