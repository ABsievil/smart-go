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
import { Request } from 'express';

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
        const request = context.switchToHttp().getRequest<Request>();
        const language = this.getLanguageFromRequest(request);

        const handler = context.getHandler();
        const options = this.reflector.get<LanguageResponseOptions>(
            LANGUAGE_RESPONSE_KEY,
            handler,
        );

        // Store handler and options in request for exception filter to use
        (request as any).__handler = handler;
        (request as any).__languageOptions = options;

        return next.handle().pipe(
            map((data) => {
                if (!options) {
                    return data;
                }

                // Add success message if data exists (successful response)
                if (data !== null && data !== undefined) {
                    const successMessage =
                        this.languageService.getSuccessMessage(
                            options.module,
                            options.successKey,
                            language,
                        );

                    // If data is an object (including arrays), add message property
                    if (typeof data === 'object') {
                        // Preserve existing structure and add message
                        return {
                            ...data,
                            message: successMessage,
                        };
                    }

                    // If data is a primitive, wrap it
                    return {
                        data,
                        message: successMessage,
                    };
                }

                return data;
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
