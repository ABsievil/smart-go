import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import {
    ENCRYPTION_IV_LENGTH,
    ENCRYPTION_KEY_LENGTH,
} from '@common/encryption/constants/encryption.constant';
import { EncryptedBodyPayload } from '@common/encryption/interfaces/encryption.interface';

@Injectable()
export class EncryptionService {
    private readonly algorithm: string;
    private readonly key: Buffer;

    constructor(private readonly configService: ConfigService) {
        this.algorithm =
            this.configService.get<string>('encryption.algorithm') ??
            'aes-256-cbc';
        const secret =
            this.configService.get<string>('encryption.secret') ??
            'smart-go-default-aes-256-secret-key';
        this.key = createHash('sha256')
            .update(secret)
            .digest()
            .subarray(0, ENCRYPTION_KEY_LENGTH);
    }

    encryptObject(payload: unknown): EncryptedBodyPayload {
        try {
            const iv = randomBytes(ENCRYPTION_IV_LENGTH);
            const cipher = createCipheriv(this.algorithm, this.key, iv);
            const payloadText = JSON.stringify(payload ?? {});

            const encrypted = Buffer.concat([
                cipher.update(payloadText, 'utf8'),
                cipher.final(),
            ]);

            return {
                iv: iv.toString('base64'),
                payload: encrypted.toString('base64'),
            };
        } catch (_error) {
            throw new InternalServerErrorException(
                'Unable to encrypt response payload',
            );
        }
    }

    decryptObject(encryptedBody: EncryptedBodyPayload): Record<string, any> {
        try {
            const iv = Buffer.from(encryptedBody.iv, 'base64');
            const encryptedPayload = Buffer.from(encryptedBody.payload, 'base64');
            const decipher = createDecipheriv(this.algorithm, this.key, iv);

            const decrypted = Buffer.concat([
                decipher.update(encryptedPayload),
                decipher.final(),
            ]).toString('utf8');

            const parsedBody = JSON.parse(decrypted);
            if (parsedBody === null || typeof parsedBody !== 'object') {
                throw new Error('Decrypted body is not an object');
            }

            return parsedBody;
        } catch (_error) {
            throw new BadRequestException(
                'Invalid encrypted request body. Decryption failed.',
            );
        }
    }
}
