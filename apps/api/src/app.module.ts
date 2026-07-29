import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [AuthModule, MeetingsModule],
})
export class AppModule {}
