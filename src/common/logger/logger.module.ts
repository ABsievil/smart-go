import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLogger } from '@common/logger/app-logger.service';
import { HttpLoggingInterceptor } from '@common/logger/http-logging.interceptor';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        AppLogger,
        {
            provide: APP_INTERCEPTOR,
            useClass: HttpLoggingInterceptor,
        },
    ],
    exports: [AppLogger],
})
export class LoggerModule {}
