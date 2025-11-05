import { registerAs } from '@nestjs/config';
import { DB_CONNECTION_NAME } from '../database/constants/database.constant';

export default registerAs(
    'database',
    (): Record<string, any> => ({
        uri: process.env?.DATABASE_URI ?? 'mongodb://localhost:27017/smart-go',
        connectionName: DB_CONNECTION_NAME,
        debug: process.env.DATABASE_DEBUG === 'true',
        timeoutOptions: {
            serverSelectionTimeoutMS: 30 * 1000, // 30 secs
            socketTimeoutMS: 30 * 1000, // 30 secs
            heartbeatFrequencyMS: 5 * 1000, // 5 secs
        },
    }),
);
