import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

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
        description:
            'ID cuộc hội thoại — server tải lịch sử tin nhắn từ DB (theo user hiện tại). Bỏ qua nếu chưa có hội thoại.',
        example: '507f1f77bcf86cd799439011',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    conversationId?: string;
}
