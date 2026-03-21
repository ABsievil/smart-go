import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '@common/configs/database.config';
import appConfig from '@common/configs/app.config';
import authConfig from '@common/configs/auth.config';
import vnpayConfig from '@common/configs/vnpay.config';
import cloudinaryConfig from '@common/configs/cloudinary.config';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_CONNECTION_NAME } from '@common/database/constants/database.constant';
import { set } from 'mongoose';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LogConfigModule } from '@common/logger/log-config.module';
import { LogConfigService } from '@common/logger/log-config.service';
import { LanguageModule } from '@common/language/language.module';
import { UploadModule } from '@common/upload/upload.module';

@Global()
@Module({
    imports: [
        LanguageModule,
        UploadModule,
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: [
                databaseConfig,
                appConfig,
                authConfig,
                vnpayConfig,
                cloudinaryConfig,
            ],
        }),
        PinoLoggerModule.forRootAsync({
            imports: [LogConfigModule],
            inject: [LogConfigService],
            useFactory: (logConfig: LogConfigService) =>
                logConfig.createOptions(),
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            connectionName: DB_CONNECTION_NAME,
            useFactory: (configService: ConfigService) => {
                const debug = configService.get('database.debug');
                const dbName = configService.get('database.name');
                const timeoutOptions = configService.get(
                    'database.timeoutOptions',
                );

                return {
                    uri: configService.get('database.uri'),
                    dbName,
                    ...timeoutOptions,
                    connectionFactory: (connection) => {
                        return connection;
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
})
export class CommonModule {}
