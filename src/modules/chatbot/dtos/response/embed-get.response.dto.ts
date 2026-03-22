import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { ChatbotEmbedType } from '@modules/chatbot/enums/chatbot.enum';

export class EmbedGetResponseDto extends BaseResponseDto {
    @ApiProperty({
        description: 'Văn bản đã được nhúng vào vector database',
        example: 'Tuyến xe buýt số 01 chạy từ Bến xe Miền Tây đến Bến Thành.',
    })
    @Expose()
    text: string;

    @ApiProperty({
        description: 'Loại nội dung',
        enum: ChatbotEmbedType,
        example: ChatbotEmbedType.ROUTE,
    })
    @Expose()
    type: ChatbotEmbedType;
}
