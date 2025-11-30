import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface LanguageMessages {
    success: Record<string, string>;
    error: Record<string, string>;
}

@Injectable()
export class LanguageService implements OnModuleInit {
    private languages: Map<string, Map<string, LanguageMessages>> = new Map();
    private defaultLanguage: string = 'en';

    constructor(private readonly configService: ConfigService) {
        this.defaultLanguage =
            this.configService.get<string>('app.language') || 'en';
    }

    onModuleInit() {
        this.loadLanguages();
    }

    private loadLanguages() {
        // Try to find languages directory relative to the compiled file location
        // In production, it will be in dist/languages
        // In development, it will be in src/languages
        let languagesDir: string;

        // Check if we're in production (dist folder exists)
        const distLanguagesPath = path.join(process.cwd(), 'dist', 'languages');
        const srcLanguagesPath = path.join(process.cwd(), 'src', 'languages');

        if (fs.existsSync(distLanguagesPath)) {
            languagesDir = distLanguagesPath;
        } else if (fs.existsSync(srcLanguagesPath)) {
            languagesDir = srcLanguagesPath;
        } else {
            // Fallback: try to find from __dirname (compiled file location)
            const compiledFileDir = __dirname;
            const possiblePaths = [
                path.join(compiledFileDir, '..', '..', '..', 'languages'),
                path.join(compiledFileDir, '..', '..', '..', '..', 'languages'),
                path.join(process.cwd(), 'languages'),
            ];

            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    languagesDir = possiblePath;
                    break;
                }
            }

            if (!languagesDir) {
                throw new Error(
                    `Languages directory not found. Tried: ${possiblePaths.join(', ')}`,
                );
            }
        }

        const languageDirs = fs.readdirSync(languagesDir, {
            withFileTypes: true,
        });

        for (const langDir of languageDirs) {
            if (langDir.isDirectory()) {
                const langCode = langDir.name;
                const langMap = new Map<string, LanguageMessages>();

                const langPath = path.join(languagesDir, langCode);
                const files = fs.readdirSync(langPath);

                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const moduleName = file.replace('.json', '');
                        const filePath = path.join(langPath, file);
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const messages: LanguageMessages = JSON.parse(content);
                        langMap.set(moduleName, messages);
                    }
                }

                this.languages.set(langCode, langMap);
            }
        }
    }

    getMessage(
        module: string,
        type: 'success' | 'error',
        key: string,
        language?: string,
    ): string {
        const lang = language || this.defaultLanguage;
        const langMap = this.languages.get(lang);

        if (!langMap) {
            // Fallback to default language
            const defaultLangMap = this.languages.get(this.defaultLanguage);
            if (!defaultLangMap) {
                return key;
            }
            const moduleMessages = defaultLangMap.get(module);
            return moduleMessages?.[type]?.[key] || key;
        }

        const moduleMessages = langMap.get(module);
        if (!moduleMessages) {
            return key;
        }

        return moduleMessages[type]?.[key] || key;
    }

    getSuccessMessage(module: string, key: string, language?: string): string {
        return this.getMessage(module, 'success', key, language);
    }

    getErrorMessage(module: string, key: string, language?: string): string {
        return this.getMessage(module, 'error', key, language);
    }
}
