import { SetMetadata } from '@nestjs/common';

export const LANGUAGE_RESPONSE_KEY = 'language_response';

export interface LanguageResponseOptions {
    module: string;
    successKey: string;
    errorKey?: string;
}

export const LanguageResponse = (options: LanguageResponseOptions) => {
    // Auto-assign errorKey = successKey if errorKey is not provided
    const finalOptions: LanguageResponseOptions = {
        ...options,
        errorKey: options.errorKey ?? options.successKey,
    };
    return SetMetadata(LANGUAGE_RESPONSE_KEY, finalOptions);
};
