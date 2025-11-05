import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@app/app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const logger = new Logger('NestJs-Main');

    const config = app.get(ConfigService);
    const host = config.get<string>('app.host') ?? '0.0.0.0';
    const port = config.get<number>('app.port') ?? 8000;
    const timezone = config.get<string>('app.timezone') ?? 'UTC';
    const language = config.get<string>('app.language') ?? 'en';
    const apiVersion = config.get<string>('app.apiVersion') ?? '1';
    const globalPrefix = config.get<string>('app.globalPrefix') ?? 'api';

    app.setGlobalPrefix(globalPrefix);

    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: apiVersion,
    });

    logger.log(`Server is running on ${host}:${port}`);

    await app.listen(port, host);
}
bootstrap();
