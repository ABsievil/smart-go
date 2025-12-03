import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { LanguageService } from '../services/language.service';
import {
    LANGUAGE_RESPONSE_KEY,
    LanguageResponseOptions,
} from '../decorators/language-response.decorator';
import { Request, Response } from 'express';

export interface LanguageResponse<T> {
    message?: string;
    data?: T;
    [key: string]: any;
}

@Injectable()
export class LanguageResponseInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly languageService: LanguageService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<Request>();
        const response = httpContext.getResponse<Response>();

        const language = this.getLanguageFromRequest(request);
        const handler = context.getHandler();

        const options = this.reflector.get<LanguageResponseOptions>(
            LANGUAGE_RESPONSE_KEY,
            handler,
        );

        // Store handler and options in request for exception filter to use
        (request as any).__handler = handler;
        (request as any).__languageOptions = options;

        if (!options) {
            return next.handle();
        }

        return next.handle().pipe(
            map((data) => {
                // If handler returns null/undefined, keep original behaviour
                if (data === null || data === undefined) {
                    return data;
                }

                const successMessage = this.languageService.getSuccessMessage(
                    options.module,
                    options.successKey,
                    language,
                );

                const statusCode = response.statusCode;

                const isListResponse =
                    typeof data === 'object' &&
                    data !== null &&
                    'data' in data &&
                    'total' in data &&
                    'page' in data &&
                    'limit' in data;

                if (isListResponse) {
                    // Flatten list response to avoid data.data
                    return {
                        statusCode,
                        message: successMessage,
                        ...(data as Record<string, any>),
                    };
                }

                // Default: wrap single-item or primitive response
                return {
                    statusCode,
                    message: successMessage,
                    data,
                };
            }),
        );
    }

    private getLanguageFromRequest(request: Request): string {
        // Try to get language from query, header, or default
        return (
            (request.query?.lang as string) ||
            (request.headers['accept-language'] as string)
                ?.split(',')[0]
                ?.split('-')[0] ||
            undefined
        );
    }
}
