import { Injectable } from '@nestjs/common';
import { BaseService } from '@common/services/base.service';
import { UserRepository } from '@modules/users/repositories/repository/user.repository';
import {
    UserDoc,
    UserEntity,
} from '@modules/users/repositories/entities/user.entity';
import { UserCreateRequestDto } from '@modules/users/dtos/request/user-create.request.dto';
import { UserUpdateRequestDto } from '@modules/users/dtos/request/user-update.request.dto';
import { UserGetResponseDto } from '@modules/users/dtos/response/user-get.response.dto';

@Injectable()
export class UserService extends BaseService<
    UserEntity,
    UserDoc,
    UserGetResponseDto,
    UserCreateRequestDto,
    UserUpdateRequestDto,
    UserRepository
> {
    constructor(private readonly userRepository: UserRepository) {
        super(userRepository, UserEntity, UserGetResponseDto);
    }

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

}
