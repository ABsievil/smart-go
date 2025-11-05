import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from 'src/modules/users/services/user.service';
import { UserRepository } from 'src/modules/users/repositories/repository/user.repository';
import {
    UserEntity,
    UserSchema,
} from 'src/modules/users/repositories/entities/user.entity';
import { DB_CONNECTION_NAME } from 'src/common/database/constants/database.constant';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: UserEntity.name,
                    schema: UserSchema,
                },
            ],
            DB_CONNECTION_NAME,
        ),
    ],
    providers: [UserRepository, UserService],
    exports: [UserService],
})
export class UserModule {}
