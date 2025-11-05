import { Module } from '@nestjs/common';
import { RouterModule } from '@src/routers/router.module';
import { CommonModule } from '@common/common.module';

@Module({
    imports: [CommonModule, RouterModule],
})
export class AppModule {}
