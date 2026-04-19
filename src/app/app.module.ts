import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RouterModule } from '@src/routers/router.module';
import { CommonModule } from '@common/common.module';
import { AppMiddlewareModule } from '@app/app.middlewares';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonModule,
        AppMiddlewareModule,
        RouterModule,
    ],
})
export class AppModule {}
