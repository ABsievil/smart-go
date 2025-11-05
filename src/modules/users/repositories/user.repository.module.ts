import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserSchema } from './entities/user.entity';
import { UserRepository } from './repository/user.repository';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: UserEntity.name,
                    schema: UserSchema,
                },
            ],
            DATABASE_CONNECTION_NAME,
        ),
    ],
    providers: [UserRepository],
    exports: [UserRepository],
})
export class UserRepositoryModule {}
