import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './configs/database.config';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_CONNECTION_NAME } from './database/constants/database.constant';
import { set } from 'mongoose';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: [databaseConfig],
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
                        if (debug) set('debug', true);
                        return connection;
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
})
export class CommonModule {}
