import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import { MessageCreateRequestDto } from './message-create.request.dto';

export class MessageUpdateRequestDto extends PartialType(
    OmitType(MessageCreateRequestDto, ['conversationId', 'role'] as const),
) {}
