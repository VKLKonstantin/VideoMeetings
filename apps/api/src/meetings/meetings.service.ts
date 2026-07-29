import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { Meeting } from './entities/meeting.entity';
import { MeetingsRepository } from './meetings.repository';

@Injectable()
export class MeetingsService {
  constructor(private readonly meetingsRepository: MeetingsRepository) {}

  create(ownerId: string, dto: CreateMeetingDto): Meeting {
    return this.meetingsRepository.create({
      title: dto.title,
      date: dto.date,
      participants: dto.participants,
      ownerId,
    });
  }

  findAllForOwner(ownerId: string): Meeting[] {
    return this.meetingsRepository.findAllByOwner(ownerId);
  }

  findOneForOwner(id: string, ownerId: string): Meeting {
    const meeting = this.meetingsRepository.findByIdAndOwner(id, ownerId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }
}
