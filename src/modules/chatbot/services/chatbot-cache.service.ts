import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from '@common/redis/redis.service';
import {
    CACHE_KEY_EMBEDDING_PREFIX,
    CACHE_KEY_REPLY_PREFIX,
} from '@modules/chatbot/constants/chatbot.constants';

export interface CachedReply {
    reply: string;
    contextCount: number;
}

/**
 * Lớp bọc Redis dành riêng cho chatbot — đảm nhiệm:
 *  - Cache embedding theo hash nội dung (embedding là hàm thuần → TTL dài).
 *  - Cache reply theo hash câu hỏi đã normalize (TTL ngắn vì knowledge base
 *    có thể thay đổi).
 */
@Injectable()
export class ChatbotCacheService {
    private readonly logger = new Logger(ChatbotCacheService.name);
    private readonly enabled: boolean;
    private readonly embeddingTtl: number;
    private readonly replyTtl: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) {
        this.enabled = this.configService.get<boolean>(
            'chatbot.cache.enabled',
            true,
        );
        this.embeddingTtl = this.configService.get<number>(
            'chatbot.cache.embeddingTtlSeconds',
            7 * 24 * 3600,
        );
        this.replyTtl = this.configService.get<number>(
            'chatbot.cache.replyTtlSeconds',
            10 * 60,
        );
    }

    // ─── Embedding ──────────────────────────────────────────────────────────

    async getEmbedding(text: string): Promise<number[] | null> {
        if (!this.enabled) return null;
        const key = this.embeddingKey(text);
        try {
            const raw = await this.redisService.get(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return null;
            return parsed as number[];
        } catch (err) {
            this.warn('getEmbedding', err);
            return null;
        }
    }

    async setEmbedding(text: string, embedding: number[]): Promise<void> {
        if (!this.enabled) return;
        const key = this.embeddingKey(text);
        try {
            await this.redisService.set(
                key,
                JSON.stringify(embedding),
                this.embeddingTtl,
            );
        } catch (err) {
            this.warn('setEmbedding', err);
        }
    }

    // ─── Reply ──────────────────────────────────────────────────────────────

    async getReply(message: string): Promise<CachedReply | null> {
        if (!this.enabled) return null;
        const key = this.replyKey(message);
        try {
            const raw = await this.redisService.get(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as Partial<CachedReply>;
            if (typeof parsed?.reply !== 'string') return null;
            return {
                reply: parsed.reply,
                contextCount: Number(parsed.contextCount ?? 0),
            };
        } catch (err) {
            this.warn('getReply', err);
            return null;
        }
    }

    async setReply(message: string, payload: CachedReply): Promise<void> {
        if (!this.enabled) return;
        const key = this.replyKey(message);
        try {
            await this.redisService.set(
                key,
                JSON.stringify(payload),
                this.replyTtl,
            );
        } catch (err) {
            this.warn('setReply', err);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private embeddingKey(text: string): string {
        return CACHE_KEY_EMBEDDING_PREFIX + this.hash(text);
    }

    private replyKey(message: string): string {
        // Normalize: trim + lowercase + collapse whitespace để coi các
        // biến thể chữ hoa/thường/khoảng trắng dư là cùng câu hỏi.
        const normalized = message.trim().toLowerCase().replace(/\s+/g, ' ');
        return CACHE_KEY_REPLY_PREFIX + this.hash(normalized);
    }

    private hash(input: string): string {
        return createHash('sha256').update(input).digest('hex');
    }

    private warn(op: string, err: unknown): void {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Cache ${op} failed (ignored): ${msg}`);
    }
}
