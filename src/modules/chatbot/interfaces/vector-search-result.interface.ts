import { ChatbotEmbedType } from '@modules/chatbot/enums/chatbot.enum';

export interface IVectorSearchResult {
    id: string;
    score: number;
    text: string;
    type: ChatbotEmbedType;
    metadata?: Record<string, any>;
}
