import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@app/app.module';
import { AppLogger } from '@common/logger/app-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LanguageResponseInterceptor } from '@common/language/interceptors/language-response.interceptor';
import { LanguageExceptionFilter } from '@common/language/filters/language-exception.filter';
import { Response } from 'express';

async function bootstrap() {
    process.env.TZ = process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh';

    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(AppLogger));

    const logger = new Logger('Bootstrap');

    const config = app.get(ConfigService);
    const host = config.get<string>('app.host') ?? '0.0.0.0';
    const port = config.get<number>('app.port') ?? 8000;
    const timezone = config.get<string>('app.timezone') ?? 'UTC';
    const language = config.get<string>('app.language') ?? 'en';
    const apiVersion = config.get<string>('app.apiVersion') ?? '1';
    const globalPrefix = config.get<string>('app.globalPrefix') ?? 'api';

    app.setGlobalPrefix(globalPrefix);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: apiVersion,
    });

    // Register global language response interceptor
    app.useGlobalInterceptors(app.get(LanguageResponseInterceptor));

    // Register global language exception filter
    app.useGlobalFilters(app.get(LanguageExceptionFilter));

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Smart Go API')
        .setDescription('API documentation')
        .setVersion(apiVersion)
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerPath = `${globalPrefix}-docs`;
    SwaggerModule.setup(swaggerPath, app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    // Redirect root path to Swagger docs
    app.getHttpAdapter().get('/', (req: any, res: Response) => {
        res.redirect(`/${swaggerPath}`);
    });

    logger.log(
        `Listening on ${host}:${port} (tz=${timezone}, lang=${language})`,
    );

    await app.listen(port, host);
}
bootstrap();
