import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Recording } from './entities/recording.entity';

type NewRecording = Omit<Recording, 'id'>;

@Injectable()
export class RecordingsRepository {
  private readonly recordings: Recording[] = [];

  create(newRecording: NewRecording): Recording {
    const recording: Recording = { id: randomUUID(), ...newRecording };
    this.recordings.push(recording);
    return recording;
  }

  findAllByMeetingId(meetingId: string): Recording[] {
    return this.recordings.filter(
      (recording) => recording.meetingId === meetingId,
    );
  }
}
