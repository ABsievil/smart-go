import { Injectable } from '@nestjs/common';
import { IGoogleAuthCodePayload } from '@modules/auth/interfaces/google-auth-code-payload.interface';

@Injectable()
export class GoogleAuthCodeStoreService {
    private readonly store = new Map<string, IGoogleAuthCodePayload>();

    save(payload: IGoogleAuthCodePayload): void {
        this.store.set(payload.code, payload);
    }

    consume(code: string): IGoogleAuthCodePayload | null {
        const payload = this.store.get(code);
        if (!payload) {
            return null;
        }

        this.store.delete(code);
        if (Date.now() > payload.expiresAt) {
            return null;
        }

        return payload;
    }
}
