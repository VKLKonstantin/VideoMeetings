import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { hashPassword, verifyPassword } from './password.util';

export interface SafeUser {
  id: string;
  email: string;
  createdAt: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const email = dto.email.toLowerCase();
    const passwordHash = await hashPassword(dto.password);
    const user = this.usersService.createUser({ email, passwordHash });

    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  async login(dto: LoginDto): Promise<SafeUser> {
    const email = dto.email.toLowerCase();
    const user = this.usersService.findByEmail(email);
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  /**
   * No real token issuer yet: AuthGuard treats the bearer value directly as
   * the user id (see src/auth/auth.guard.ts), so the id doubles as the
   * token other endpoints expect.
   */
  generateToken(user: SafeUser): string {
    return user.id;
  }
}
