import { registerAs } from '@nestjs/config';

export default registerAs(
    'cloudinary',
    (): Record<string, any> => ({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
        apiKey: process.env.CLOUDINARY_API_KEY ?? '',
        apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
        secure: process.env.CLOUDINARY_SECURE !== 'false',
    }),
);
