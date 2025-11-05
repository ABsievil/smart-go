import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    UserEntity,
    UserDoc,
} from '@modules/users/repositories/entities/user.entity';
import { DBRepositoryBase } from '@common/database/repositories/database.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class UserRepository extends DBRepositoryBase<UserEntity, UserDoc> {
    constructor(
        @InjectDatabaseModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>,
    ) {
        super(userModel);
    }
}
