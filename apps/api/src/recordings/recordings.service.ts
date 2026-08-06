import { BadRequestException, Injectable } from '@nestjs/common';
import { Recording } from './entities/recording.entity';
import { detectMediaFormat } from './file-signature.util';
import { RecordingsRepository } from './recordings.repository';
import { RecordingsStorage } from './recordings.storage';

export type PublicRecording = Omit<Recording, 'storedPath'>;

@Injectable()
export class RecordingsService {
  constructor(
    private readonly recordingsRepository: RecordingsRepository,
    private readonly recordingsStorage: RecordingsStorage,
  ) {}

  async createFromUpload(
    meetingId: string,
    file: Express.Multer.File,
  ): Promise<PublicRecording> {
    const detectedFormat = await detectMediaFormat(file.path);
    if (!detectedFormat) {
      await this.recordingsStorage.discard(file.path);
      throw new BadRequestException('Неподдерживаемый формат файла записи');
    }

    const storedPath = await this.recordingsStorage.persist(
      file.path,
      meetingId,
    );

    const recording = this.recordingsRepository.create({
      meetingId,
      filename: file.originalname,
      size: file.size,
      format: detectedFormat,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
      storedPath,
    });

    return toPublicRecording(recording);
  }

  findAllForMeeting(meetingId: string): PublicRecording[] {
    return this.recordingsRepository
      .findAllByMeetingId(meetingId)
      .map(toPublicRecording);
  }
}

function toPublicRecording(recording: Recording): PublicRecording {
  const { id, meetingId, filename, size, format, status, uploadedAt } =
    recording;
  return { id, meetingId, filename, size, format, status, uploadedAt };
}
