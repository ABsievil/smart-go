import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ENCRYPTION_BODY_FIELDS } from '@common/encryption/constants/encryption.constant';
import {
    DECRYPTION_METADATA_KEY,
    ENCRYPTION_METADATA_KEY,
} from '@common/encryption/constants/encryption-metadata.constant';
import { EncryptionService } from '@common/encryption/services/encryption.service';

@Injectable()
export class ResponseEncryptionInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly encryptionService: EncryptionService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<Request>();
        const shouldDecrypt = this.shouldDecryptRequest(context);
        const shouldEncrypt = this.shouldEncryptResponse(context);

        if (shouldDecrypt) {
            this.decryptRequestBody(request);
        }

        if (!shouldEncrypt) {
            return next.handle();
        }

        return next
            .handle()
            .pipe(map((responseBody) => this.encryptionService.encryptObject(responseBody)));
    }

    private shouldEncryptResponse(context: ExecutionContext): boolean {
        return this.reflector.getAllAndOverride<boolean>(
            ENCRYPTION_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );
    }

    private shouldDecryptRequest(context: ExecutionContext): boolean {
        return this.reflector.getAllAndOverride<boolean>(
            DECRYPTION_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );
    }

    private decryptRequestBody(request: Request): void {
        const body = request.body as Record<string, any> | undefined;
        const iv = body?.[ENCRYPTION_BODY_FIELDS.iv];
        const payload = body?.[ENCRYPTION_BODY_FIELDS.payload];

        if (!iv || !payload) {
            throw new BadRequestException(
                `Encrypted request body must contain "${ENCRYPTION_BODY_FIELDS.iv}" and "${ENCRYPTION_BODY_FIELDS.payload}".`,
            );
        }

        request.body = this.encryptionService.decryptObject({ iv, payload });
    }
}
