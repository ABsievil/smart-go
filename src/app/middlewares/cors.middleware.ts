import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    private readonly allowOrigin: boolean | string | string[];
    private readonly allowMethod: string[] | undefined;
    private readonly allowHeader: string[] | undefined;

    constructor(private readonly configService: ConfigService) {
        const originsFromEnv =
            this.configService.get<string>('APP_CORS_ORIGINS') ?? '*';

        this.allowOrigin =
            originsFromEnv === '*'
                ? '*'
                : originsFromEnv
                      .split(',')
                      .map((origin) => origin.trim())
                      .filter((origin) => origin.length > 0);

        const methodsFromEnv =
            this.configService.get<string>('APP_CORS_METHODS');
        this.allowMethod = methodsFromEnv
            ? methodsFromEnv
                  .split(',')
                  .map((method) => method.trim())
                  .filter((method) => method.length > 0)
            : undefined;

        const headersFromEnv =
            this.configService.get<string>('APP_CORS_HEADERS');
        this.allowHeader = headersFromEnv
            ? headersFromEnv
                  .split(',')
                  .map((header) => header.trim())
                  .filter((header) => header.length > 0)
            : undefined;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        const corsOptions: CorsOptions = {
            origin: this.allowOrigin,
            methods: this.allowMethod ?? [
                'GET',
                'HEAD',
                'PUT',
                'PATCH',
                'POST',
                'DELETE',
                'OPTIONS',
            ],
            allowedHeaders: this.allowHeader ?? [
                'Origin',
                'X-Requested-With',
                'Content-Type',
                'Accept',
                'Authorization',
            ],
            preflightContinue: false,
            credentials: true,
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
        };

        cors(corsOptions)(req, res, next);
    }
}
