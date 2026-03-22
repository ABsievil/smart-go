import { BaseResponseListDto } from '@common/dtos/base-response.list.dto';
import { MessageGetResponseDto } from '@modules/messages/dtos/response/message-get.response.dto';

export class MessageListResponseDto extends BaseResponseListDto<MessageGetResponseDto> {}
