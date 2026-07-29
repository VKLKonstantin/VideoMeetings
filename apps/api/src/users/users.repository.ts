import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';

type NewUser = Omit<User, 'id'>;

@Injectable()
export class UsersRepository {
  private readonly users: User[] = [];

  findByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email === email);
  }

  create(newUser: NewUser): User {
    const user: User = { id: randomUUID(), ...newUser };
    this.users.push(user);
    return user;
  }
}
