import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    MessageEntity,
    MessageDoc,
} from '@modules/messages/repositories/entities/message.entity';
import { DBRepositoryBase } from '@common/database/repositories/database.repository';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';

@Injectable()
export class MessageRepository extends DBRepositoryBase<
    MessageEntity,
    MessageDoc
> {
    constructor(
        @InjectDatabaseModel(MessageEntity.name)
        private readonly messageModel: Model<MessageEntity>,
    ) {
        super(messageModel);
    }

    /**
     * @description Insert nhiều message trong một round-trip MongoDB.
     * Dùng cho lưu cặp tin nhắn (user + bot) sau mỗi lượt chat.
     */
    async insertMany(data: Partial<MessageEntity>[]): Promise<MessageDoc[]> {
        if (!data.length) return [];

        const docs = data.map((d) => ({ ...d, deleted: false }));
        const inserted = await this.messageModel.insertMany(docs, {
            ordered: false,
        });
        return inserted as unknown as MessageDoc[];
    }

    /**
     * @description Lấy N message mới nhất của một conversation (không count, không
     * aggregate). Trả về theo thứ tự thời gian tăng dần để feed vào LLM.
     */
    async findLatestByConversation(
        conversationId: string,
        userId: string,
        limit: number,
    ): Promise<MessageEntity[]> {
        if (limit <= 0) return [];

        const docs = await this.messageModel
            .find({ conversationId, userId, deleted: false })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('role content createdAt')
            .lean<MessageEntity[]>()
            .exec();

        return docs.reverse();
    }
}
