import { Injectable } from '@nestjs/common';
import { UserRepository } from '@modules/users/repositories/repository/user.repository';
import { UserEntity } from '@modules/users/repositories/entities/user.entity';
import { UserRole } from '@modules/users/enums/user-role.enum';

export interface ICreateUserPayload {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
}

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async findByEmail(email: string): Promise<UserEntity | null> {
        const results = await this.userRepository.find<UserEntity>({
            email: email.toLowerCase(),
        });
        return results[0] ?? null;
    }

    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOneById<UserEntity>(id);
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await this.userRepository.count({
            email: email.toLowerCase(),
        });
        return count > 0;
    }

    async create(payload: ICreateUserPayload): Promise<UserEntity> {
        return this.userRepository.create<UserEntity>({
            ...payload,
            role: payload.role ?? UserRole.USER,
        });
    }
}
