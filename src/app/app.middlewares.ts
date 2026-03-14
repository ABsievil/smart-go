import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorsMiddleware } from '@app/middlewares/cors.middleware';

@Module({})
export class AppMiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(CorsMiddleware).forRoutes('*');
    }
}
