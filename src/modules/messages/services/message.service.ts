import { Injectable } from '@nestjs/common';
import { BaseService } from '@common/services/base.service';
import { MessageRepository } from '@modules/messages/repositories/repository/message.repository';
import {
    MessageDoc,
    MessageEntity,
} from '@modules/messages/repositories/entities/message.entity';
import { MessageCreateRequestDto } from '@modules/messages/dtos/request/message-create.request.dto';
import { MessageUpdateRequestDto } from '@modules/messages/dtos/request/message-update.request.dto';
import { MessageGetResponseDto } from '@modules/messages/dtos/response/message-get.response.dto';

@Injectable()
export class MessageService extends BaseService<
    MessageEntity,
    MessageDoc,
    MessageGetResponseDto,
    MessageCreateRequestDto,
    MessageUpdateRequestDto,
    MessageRepository
> {
    constructor(private readonly messageRepository: MessageRepository) {
        super(messageRepository, MessageEntity, MessageGetResponseDto);
    }

    /**
     * @description Insert nhiều message trong một round-trip MongoDB (dùng cho lưu
     * cặp tin nhắn user + bot sau mỗi lượt chat).
     */
    async createMany(dtos: MessageCreateRequestDto[]): Promise<MessageDoc[]> {
        if (!dtos.length) return [];
        return this.messageRepository.insertMany(dtos);
    }

    /**
     * @description Lấy N message mới nhất của một conversation, sắp xếp theo thời
     * gian tăng dần. Không thực hiện count — tối ưu cho history fetch.
     */
    async findLatestByConversation(
        conversationId: string,
        userId: string,
        limit: number,
    ): Promise<MessageEntity[]> {
        return this.messageRepository.findLatestByConversation(
            conversationId,
            userId,
            limit,
        );
    }
}
