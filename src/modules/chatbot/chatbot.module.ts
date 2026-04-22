import { Module } from '@nestjs/common';
import { DashScopeService } from '@modules/chatbot/services/dashscope.service';
import { ZillizService } from '@modules/chatbot/services/zilliz.service';
import { ChatbotService } from '@modules/chatbot/services/chatbot.service';
import { ChatbotCacheService } from '@modules/chatbot/services/chatbot-cache.service';
import { MessageModule } from '@modules/messages/message.module';

@Module({
    imports: [MessageModule],
    providers: [
        DashScopeService,
        ZillizService,
        ChatbotCacheService,
        ChatbotService,
    ],
    exports: [ChatbotService, ChatbotCacheService],
})
export class ChatbotModule {}
