import { Module } from '@nestjs/common';
import { UserController } from 'src/modules/users/controllers/user.controller';
import { UserModule } from 'src/modules/users/user.module';

@Module({
    controllers: [UserController],
    imports: [UserModule],
})

export class RoutesSharedModule {}