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

    @ApiPropertyOptional({
        description: 'Số lượng tài liệu tham khảo được tìm thấy trong vector DB',
        example: 3,
    })
    @Expose()
    contextCount?: number;
}
