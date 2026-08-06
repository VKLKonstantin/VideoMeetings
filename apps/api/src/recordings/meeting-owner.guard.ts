import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { MeetingsService } from '../meetings/meetings.service';

/**
 * Verifies the :id route param is a meeting owned by the authenticated user
 * before the request reaches the handler — runs as a guard (before
 * FileInterceptor) so an unauthorized upload gets 404 without multer ever
 * writing the file to disk. Reuses MeetingsService.findOneForOwner, which
 * already throws NotFoundException without leaking whether the meeting
 * exists for another owner.
 */
@Injectable()
export class MeetingOwnerGuard implements CanActivate {
  constructor(private readonly meetingsService: MeetingsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const meetingId = request.params.id as string;
    this.meetingsService.findOneForOwner(meetingId, request.user.id);
    return true;
  }
}
