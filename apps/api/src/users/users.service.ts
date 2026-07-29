import { ConflictException, Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

export interface NewUserData {
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  createUser(data: NewUserData): User {
    if (this.usersRepository.findByEmail(data.email)) {
      throw new ConflictException('Email is already registered');
    }

    return this.usersRepository.create({
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: new Date().toISOString(),
    });
  }

  findByEmail(email: string): User | undefined {
    return this.usersRepository.findByEmail(email);
  }
}
