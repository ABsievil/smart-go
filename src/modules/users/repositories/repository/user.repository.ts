import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    UserEntity,
    UserDoc,
} from 'src/modules/users/repositories/entities/user.entity';
import { DBRepositoryBase } from 'src/common/database/repositories/database.repository';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class UserRepository extends DBRepositoryBase<UserEntity, UserDoc> {
    constructor(
        @InjectDatabaseModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>,
    ) {
        super(userModel);
    }
}
