import { ChatMessageRole } from '@modules/chatbot/enums/chatbot.enum';

export interface IChatMessage {
    role: ChatMessageRole;
    content: string;
}
