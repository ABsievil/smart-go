import { Module } from '@nestjs/common';
import { HuggingFaceService } from '@modules/chatbot/services/huggingface.service';
import { ZillizService } from '@modules/chatbot/services/zilliz.service';
import { ChatbotService } from '@modules/chatbot/services/chatbot.service';

@Module({
    providers: [HuggingFaceService, ZillizService, ChatbotService],
    exports: [ChatbotService],
})
export class ChatbotModule {}
