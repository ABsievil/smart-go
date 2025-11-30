import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    ExecutionContext,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { LanguageService } from '../services/language.service';
import {
    LANGUAGE_RESPONSE_KEY,
    LanguageResponseOptions,
} from '../decorators/language-response.decorator';

@Catch()
export class LanguageExceptionFilter implements ExceptionFilter {
    constructor(
        private readonly reflector: Reflector,
        private readonly languageService: LanguageService,
    ) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Get language from request
        const language = this.getLanguageFromRequest(request);

        // Get language options from request (stored by interceptor)
        const options = (request as any).__languageOptions as
            | LanguageResponseOptions
            | undefined;

        // Determine status code
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // Get error message
        let errorMessage: string;
        if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                errorMessage = exceptionResponse;
            } else if (
                typeof exceptionResponse === 'object' &&
                exceptionResponse !== null &&
                'message' in exceptionResponse
            ) {
                const message = (exceptionResponse as any).message;
                errorMessage = Array.isArray(message)
                    ? message[0]
                    : message || exception.message;
            } else {
                errorMessage = exception.message;
            }
        } else {
            errorMessage = 'Internal server error';
        }

        // If we have language options, try to get error message from language files
        if (options && options.errorKey) {
            const translatedError = this.languageService.getErrorMessage(
                options.module,
                options.errorKey,
                language,
            );
            // Only use translated message if it's different from the key (meaning translation exists)
            if (translatedError !== options.errorKey) {
                errorMessage = translatedError;
            }
        }

        // Build response
        const errorResponse: any = {
            statusCode: status,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        // If exception has additional details, include them
        if (
            exception instanceof HttpException &&
            typeof exception.getResponse() === 'object'
        ) {
            const exceptionResponse = exception.getResponse() as any;
            if (exceptionResponse.error) {
                errorResponse.error = exceptionResponse.error;
            }
        }

        response.status(status).json(errorResponse);
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
