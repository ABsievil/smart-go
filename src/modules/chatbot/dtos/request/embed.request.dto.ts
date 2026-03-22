import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsObject,
    MaxLength,
} from 'class-validator';
import { ChatbotEmbedType } from '@modules/chatbot/enums/chatbot.enum';

export class EmbedRequestDto {
    @ApiProperty({
        description: 'Văn bản cần nhúng vào vector database',
        example: 'Tuyến xe buýt số 01 chạy từ Bến xe Miền Tây đến Bến Thành.',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(4000)
    text: string;

    @ApiProperty({
        description: 'Loại nội dung',
        enum: ChatbotEmbedType,
        example: ChatbotEmbedType.ROUTE,
    })
    @IsEnum(ChatbotEmbedType)
    type: ChatbotEmbedType;

    @ApiPropertyOptional({
        description: 'Metadata bổ sung',
        example: { routeCode: '01', routeName: 'Tuyến 01' },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
