import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Meeting } from './entities/meeting.entity';

type NewMeeting = Omit<Meeting, 'id'>;

@Injectable()
export class MeetingsRepository {
  private readonly meetings: Meeting[] = [];

  create(newMeeting: NewMeeting): Meeting {
    const meeting: Meeting = { id: randomUUID(), ...newMeeting };
    this.meetings.push(meeting);
    return meeting;
  }

  findAllByOwner(ownerId: string): Meeting[] {
    return this.meetings.filter((meeting) => meeting.ownerId === ownerId);
  }

  findByIdAndOwner(id: string, ownerId: string): Meeting | undefined {
    return this.meetings.find(
      (meeting) => meeting.id === id && meeting.ownerId === ownerId,
    );
  }
}
