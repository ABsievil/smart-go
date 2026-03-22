import { UserRole } from '@modules/users/enums/user-role.enum';
import { ChatMessageRole } from '@modules/chatbot/enums/chatbot.enum';
import { ChatHistoryItemDto } from '@modules/chatbot/dtos/request/chat-history-item.request.dto';
import { MessageEntity } from '@modules/messages/repositories/entities/message.entity';

function userRoleToChatMessageRole(role: UserRole): ChatMessageRole {
    switch (role) {
        case UserRole.BOT:
            return ChatMessageRole.ASSISTANT;
        case UserRole.USER:
        case UserRole.ADMIN:
        default:
            return ChatMessageRole.USER;
    }
}

// Map stored messages (UserRole) sang định dạng lịch sử dùng cho LLM (ChatMessageRole / OpenAI).
export function messagesToChatHistoryItems(
    messages: Pick<MessageEntity, 'role' | 'content'>[],
): ChatHistoryItemDto[] {
    return messages.map((m) => ({
        role: userRoleToChatMessageRole(m.role),
        content: m.content,
    }));
}
