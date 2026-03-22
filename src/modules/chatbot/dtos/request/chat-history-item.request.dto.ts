import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ChatMessageRole } from '@modules/chatbot/enums/chatbot.enum';

export class ChatHistoryItemDto {
    @ApiProperty({
        description: 'Vai trò người gửi tin nhắn',
        enum: ChatMessageRole,
        example: ChatMessageRole.USER,
    })
    @IsEnum(ChatMessageRole)
    role: ChatMessageRole;

    @ApiProperty({
        description: 'Nội dung tin nhắn',
        example: 'Tuyến 01 đi qua những trạm nào?',
    })
    @IsString()
    @IsNotEmpty()
    content: string;
}
