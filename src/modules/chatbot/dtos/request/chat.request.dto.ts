import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    ValidateNested,
    IsEnum,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatHistoryItemDto } from './chat-history-item.request.dto';

export class ChatRequestDto {
    @ApiProperty({
        description: 'Tin nhắn của người dùng',
        example: 'Làm thế nào để đi từ Bến xe Miền Tây đến Bến Thành?',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    message: string;

    @ApiPropertyOptional({
        description: 'Lịch sử cuộc trò chuyện trước đó',
        type: [ChatHistoryItemDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatHistoryItemDto)
    history?: ChatHistoryItemDto[];
}
