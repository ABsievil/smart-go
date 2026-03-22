import { Injectable, ConsoleLogger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Logger gọn, một dòng — JSON khi production (dễ ship tới ELK/CloudWatch),
 * text ISO + level + context khi development.
 */
@Injectable()
export class AppLogger extends ConsoleLogger {
    private readonly jsonFormat: boolean;

    constructor(private readonly configService: ConfigService) {
        const nodeEnv = (
            configService.get<string>('app.nodeEnv') ||
            process.env.NODE_ENV ||
            ''
        ).toLowerCase();
        const isProd = nodeEnv === 'production';
        const logFormatEnv = process.env.LOG_FORMAT;
        const jsonFormat =
            logFormatEnv === 'json' ||
            (logFormatEnv !== 'pretty' && isProd);

        super(undefined, {
            logLevels: isProd
                ? ['log', 'warn', 'error', 'fatal']
                : ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'],
        });

        this.jsonFormat = jsonFormat;
    }

    protected printMessages(
        messages: unknown[],
        context = '',
        logLevel: LogLevel = 'log',
        writeStreamType?: 'stdout' | 'stderr',
    ): void {
        const stream = writeStreamType ?? 'stdout';
        for (const message of messages) {
            const line = this.formatAppLine(logLevel, context, message);
            process[stream].write(`${line}\n`);
        }
    }

    private formatAppLine(
        logLevel: LogLevel,
        context: string,
        message: unknown,
    ): string {
        const msg = this.serializeMessage(message);
        if (this.jsonFormat) {
            return JSON.stringify({
                ts: new Date().toISOString(),
                level: logLevel,
                ...(context ? { context } : {}),
                msg,
            });
        }
        const ts = new Date().toISOString();
        const levelLabel = logLevel.toUpperCase().padEnd(5);
        const coloredLevel = this.colorize(levelLabel, logLevel);
        const contextPart = context
            ? `${this.formatContextYellow(`[${context}]`)} `
            : '';
        const coloredMsg = this.colorize(msg, logLevel);
        return `${ts} ${coloredLevel} ${contextPart}${coloredMsg}`;
    }

    /** Giống Nest `formatContext`: vàng, tôn trọng NO_COLOR. */
    private formatContextYellow(text: string): string {
        if (process.env.NO_COLOR) {
            return text;
        }
        return `\x1B[38;5;3m${text}\x1B[39m`;
    }

    private serializeMessage(message: unknown): string {
        if (message === null || message === undefined) {
            return String(message);
        }
        if (typeof message === 'object') {
            try {
                return JSON.stringify(message);
            } catch {
                return String(message);
            }
        }
        return String(message);
    }
}
