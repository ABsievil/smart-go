import { Module } from '@nestjs/common';
import { DashScopeService } from '@modules/chatbot/services/dashscope.service';
import { ZillizService } from '@modules/chatbot/services/zilliz.service';
import { ChatbotService } from '@modules/chatbot/services/chatbot.service';

@Module({
    providers: [DashScopeService, ZillizService, ChatbotService],
    exports: [ChatbotService],
})
export class ChatbotModule {}
