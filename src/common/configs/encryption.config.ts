import { registerAs } from '@nestjs/config';

export default registerAs(
    'encryption',
    (): Record<string, any> => ({
        secret:
            process.env.ENCRYPTION_SECRET ??
            'smart-go-default-aes-256-secret-key',
        algorithm: process.env.ENCRYPTION_ALGORITHM ?? 'aes-256-cbc',
    }),
);
