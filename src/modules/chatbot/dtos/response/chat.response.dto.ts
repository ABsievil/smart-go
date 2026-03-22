import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ChatResponseDto {
    @ApiProperty({
        description: 'Câu trả lời từ AI Assistant',
        example:
            'Để đi từ Bến xe Miền Tây đến Bến Thành, bạn có thể đi tuyến 01...',
    })
    @Expose()
    reply: string;

    @ApiProperty({
        description:
            'ID cuộc hội thoại — tin nhắn đã được lưu DB; gửi lại field này ở lần chat tiếp theo để nối lịch sử',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @Expose()
    conversationId: string;

    @ApiPropertyOptional({
        description: 'Số lượng tài liệu tham khảo được tìm thấy trong vector DB',
        example: 3,
    })
    @Expose()
    contextCount?: number;
}
