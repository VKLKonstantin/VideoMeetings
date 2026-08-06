import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { MeetingOwnerGuard } from './meeting-owner.guard';
import { RecordingTooLargeFilter } from './recording-too-large.filter';
import { recordingsMulterOptions } from './recordings.multer-options';
import { RecordingsService } from './recordings.service';

@UseGuards(AuthGuard, MeetingOwnerGuard)
@Controller('meetings/:id/recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  @UseFilters(RecordingTooLargeFilter)
  @UseInterceptors(FileInterceptor('file', recordingsMulterOptions))
  async upload(
    @Param('id') meetingId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Файл записи обязателен и должен быть в допустимом формате',
      );
    }
    return this.recordingsService.createFromUpload(meetingId, file);
  }

  @Get()
  findAll(@Param('id') meetingId: string) {
    return this.recordingsService.findAllForMeeting(meetingId);
  }
}
