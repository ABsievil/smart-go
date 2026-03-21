import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/redis/redis.service';
import { AUTH_OAUTH } from '@modules/auth/constants/auth.constants';
import { IGoogleAuthCodePayload } from '@modules/auth/interfaces/google-auth-code-payload.interface';

@Injectable()
export class GoogleAuthCodeStoreService {
    constructor(private readonly redisService: RedisService) {}

    async save(payload: IGoogleAuthCodePayload): Promise<void> {
        const key = this.getKey(payload.code);
        const ttlMs = payload.expiresAt - Date.now();
        const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

        await this.redisService.set(key, JSON.stringify(payload), ttlSeconds);
    }

    async consume(code: string): Promise<IGoogleAuthCodePayload | null> {
        const key = this.getKey(code);
        const raw = await this.redisService.getClient().call('GETDEL', key);

        if (typeof raw !== 'string') {
            return null;
        }

        const payload = JSON.parse(raw) as IGoogleAuthCodePayload;
        if (Date.now() > payload.expiresAt) {
            return null;
        }

        return payload;
    }

    private getKey(code: string): string {
        return `${AUTH_OAUTH.GOOGLE_AUTH_CODE_REDIS_KEY_PREFIX}${code}`;
    }
}
