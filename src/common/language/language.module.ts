import { Module, Global } from '@nestjs/common';
import { LanguageService } from './services/language.service';
import { LanguageExceptionFilter } from './filters/language-exception.filter';
import { LanguageResponseInterceptor } from './interceptors/language-response.interceptor';

@Global()
@Module({
    providers: [
        LanguageService,
        LanguageExceptionFilter,
        LanguageResponseInterceptor,
    ],
    exports: [
        LanguageService,
        LanguageExceptionFilter,
        LanguageResponseInterceptor,
    ],
})
export class LanguageModule {}
