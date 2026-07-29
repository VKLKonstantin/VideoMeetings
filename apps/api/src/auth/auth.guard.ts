import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest } from './authenticated-request';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['authorization'];

    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException();
    }

    const userId = header.slice(BEARER_PREFIX.length).trim();
    if (!userId) {
      throw new UnauthorizedException();
    }

    (request as AuthenticatedRequest).user = { id: userId };
    return true;
  }
}
