import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LOG_EXCLUDED_ROUTES } from '@common/logger/log.constants';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest<Request>();
        const path = req.originalUrl ?? req.url ?? '';

        if (this.shouldSkip(path)) {
            return next.handle();
        }

        const start = Date.now();
        return next.handle().pipe(
            finalize(() => {
                const res = context.switchToHttp().getResponse<Response>();
                const ms = Date.now() - start;
                const status = res.statusCode;
                this.logger.log(`${req.method} ${path} ${status} ${ms}ms`);
            }),
        );
    }

    private shouldSkip(path: string): boolean {
        const pathname = path.split('?')[0];
        if (pathname.includes('-docs')) {
            return true;
        }
        return LOG_EXCLUDED_ROUTES.some(
            (route) => pathname === route || pathname.startsWith(`${route}/`),
        );
    }
}
