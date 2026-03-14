import { Module } from '@nestjs/common';
import { RouterModule } from '@src/routers/router.module';
import { CommonModule } from '@common/common.module';
import { AppMiddlewareModule } from '@app/app.middlewares';

@Module({
    imports: [CommonModule, AppMiddlewareModule, RouterModule],
})
export class AppModule {}
