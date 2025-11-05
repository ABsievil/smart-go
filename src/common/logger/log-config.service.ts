import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import {
    LOG_EXCLUDED_ROUTES,
    LOG_SENSITIVE_FIELDS,
} from '@common/logger/log.constants';

@Injectable()
export class LogConfigService {
    constructor(private readonly configService: ConfigService) {}

    createOptions(): Params {
        const isProd =
            (this.configService.get<string>('NODE_ENV') || '').toLowerCase() ===
            'production';
        const level =
            this.configService.get<string>('logger.level') ||
            (isProd ? 'info' : 'debug');
        const autoLoggerEnabled = this.configService.get<boolean>(
            'logger.auto',
            true,
        );

        return {
            pinoHttp: {
                level,
                transport: isProd
                    ? undefined
                    : {
                          target: 'pino-pretty',
                          options: {
                              colorize: true,
                              singleLine: true,
                              translateTime: 'SYS:standard',
                              ignore: 'pid,hostname',
                          },
                      },
                base: undefined,
                messageKey: 'msg',
                timestamp: false,
                redact: {
                    paths: [
                        ...LOG_SENSITIVE_FIELDS.map((f) =>
                            f.includes('-')
                                ? `req.headers["${f}"]`
                                : `req.headers.${f}`,
                        ),
                        ...LOG_SENSITIVE_FIELDS.map((f) =>
                            f.includes('-')
                                ? `req.body["${f}"]`
                                : `req.body.${f}`,
                        ),
                    ],
                    censor: '***',
                },
                serializers: {
                    req(req) {
                        return {
                            id: (req as any).id,
                            method: req.method,
                            url: req.url,
                            params: (req as any).params,
                            query: (req as any).query,
                        };
                    },
                    res(res) {
                        return {
                            statusCode: res.statusCode,
                        };
                    },
                },
                autoLogging: autoLoggerEnabled
                    ? {
                          ignore: (r: any) =>
                              LOG_EXCLUDED_ROUTES.includes(r.url),
                      }
                    : false,
            },
        };
    }
}
