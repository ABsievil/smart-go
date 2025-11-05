import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/users/repositories/user.repository.module';
import { UserService } from 'src/modules/users/services/user.service';

@Module({
  imports: [UserRepositoryModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
