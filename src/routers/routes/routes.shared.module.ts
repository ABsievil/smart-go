import { Module } from '@nestjs/common';
import { UserController } from '@modules/users/controllers/user.controller';
import { UserModule } from '@modules/users/user.module';

@Module({
    controllers: [UserController],
    imports: [UserModule],
})
export class RoutesSharedModule {}
