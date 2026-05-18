import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from '@common/redis/redis.service';
import { MessageService } from '@modules/messages/services/message.service';
import { ChatHistoryItemDto } from '@modules/chatbot/dtos/request/chat-history-item.request.dto';
import { ChatMessageRole } from '@modules/chatbot/enums/chatbot.enum';
import { messagesToChatHistoryItems } from '@modules/chatbot/utils/message-to-chat-history.util';
import {
    CACHE_KEY_EMBEDDING_PREFIX,
    CACHE_KEY_HISTORY_PREFIX,
    CACHE_KEY_REPLY_PREFIX,
    CHAT_HISTORY_MESSAGE_LIMIT,
} from '@modules/chatbot/constants/chatbot.constants';
import { ICachedReply } from '@modules/chatbot/interfaces/cached-reply.interface';

/**
 * Lớp bọc Redis dành riêng cho chatbot — đảm nhiệm:
 *  - Cache embedding theo hash nội dung (embedding là hàm thuần → TTL dài).
 *  - Cache reply theo hash câu hỏi đã normalize (TTL ngắn vì knowledge base
 *    có thể thay đổi).
 *  - Read-through cache lịch sử hội thoại theo (userId, conversationId);
 *    sau khi lưu Mongo thành công, cập nhật snapshot để lượt sau tránh query DB.
 */
@Injectable()
export class ChatbotCacheService {
    private readonly logger = new Logger(ChatbotCacheService.name);
    private readonly enabled: boolean;
    private readonly embeddingTtl: number;
    private readonly replyTtl: number;
    private readonly historyTtl: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly messageService: MessageService,
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
        this.historyTtl = this.configService.get<number>(
            'chatbot.cache.historyTtlSeconds',
            24 * 3600,
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

    async getReply(message: string): Promise<ICachedReply | null> {
        if (!this.enabled) return null;
        const key = this.replyKey(message);
        try {
            const raw = await this.redisService.get(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as Partial<ICachedReply>;
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

    async setReply(message: string, payload: ICachedReply): Promise<void> {
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

    // ─── Conversation history (read-through + append sau persist) ────────────

    /**
     * Lịch sử dùng cho LLM: Redis hit → tránh Mongo; miss → Mongo rồi ghi lại Redis.
     * Không có `conversationId` → hội thoại mới, trả mảng rỗng (không gọi DB).
     */
    async loadConversationHistory(
        userId: string,
        conversationId?: string | null,
    ): Promise<ChatHistoryItemDto[]> {
        const cid = conversationId?.trim();
        if (!cid) return [];

        if (!this.enabled) {
            return this.fetchHistoryFromDatabase(userId, cid);
        }

        const key = this.historyKey(userId, cid);
        try {
            const raw = await this.redisService.get(key);
            if (raw) {
                const parsed = this.parseHistoryItemsJson(raw);
                if (parsed !== null) {
                    return this.trimHistory(parsed);
                }
            }
        } catch (err) {
            this.warn('loadConversationHistory redis', err);
        }

        const items = await this.fetchHistoryFromDatabase(userId, cid);
        await this.persistHistorySnapshot(userId, cid, items);
        return items;
    }

    /**
     * Gọi sau `createMany` thành công: nối lượt user+assistant vào snapshot,
     * cắt theo giới hạn context — lượt sau đọc từ Redis không cần query Mongo.
     */
    async appendTurnToHistoryCache(
        userId: string,
        conversationId: string,
        priorHistory: ChatHistoryItemDto[],
        userContent: string,
        botContent: string,
    ): Promise<void> {
        if (!this.enabled) return;

        const next = this.trimHistory([
            ...priorHistory,
            { role: ChatMessageRole.USER, content: userContent },
            { role: ChatMessageRole.ASSISTANT, content: botContent },
        ]);

        await this.persistHistorySnapshot(userId, conversationId, next);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private async fetchHistoryFromDatabase(
        userId: string,
        conversationId: string,
    ): Promise<ChatHistoryItemDto[]> {
        const msgs = await this.messageService.findLatestByConversation(
            conversationId,
            userId,
            CHAT_HISTORY_MESSAGE_LIMIT,
        );
        return messagesToChatHistoryItems(msgs);
    }

    private async persistHistorySnapshot(
        userId: string,
        conversationId: string,
        items: ChatHistoryItemDto[],
    ): Promise<void> {
        if (!this.enabled) return;
        const key = this.historyKey(userId, conversationId);
        try {
            await this.redisService.set(
                key,
                JSON.stringify(this.trimHistory(items)),
                this.historyTtl,
            );
        } catch (err) {
            this.warn('persistHistorySnapshot', err);
            try {
                await this.redisService.del(key);
            } catch (delErr) {
                this.warn('persistHistorySnapshot del', delErr);
            }
        }
    }

    private trimHistory(items: ChatHistoryItemDto[]): ChatHistoryItemDto[] {
        if (items.length <= CHAT_HISTORY_MESSAGE_LIMIT) return items;
        return items.slice(-CHAT_HISTORY_MESSAGE_LIMIT);
    }

    private parseHistoryItemsJson(raw: string): ChatHistoryItemDto[] | null {
        try {
            const data = JSON.parse(raw) as unknown;
            if (!Array.isArray(data)) return null;
            const out: ChatHistoryItemDto[] = [];
            for (const row of data) {
                if (!row || typeof row !== 'object') return null;
                const r = row as Record<string, unknown>;
                const role = r.role;
                const content = r.content;
                if (role !== ChatMessageRole.USER && role !== ChatMessageRole.ASSISTANT) {
                    return null;
                }
                if (typeof content !== 'string' || !content.length) {
                    return null;
                }
                out.push({ role, content });
            }
            return out;
        } catch {
            return null;
        }
    }

    private historyKey(userId: string, conversationId: string): string {
        return `${CACHE_KEY_HISTORY_PREFIX}${userId}:${conversationId}`;
    }

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
