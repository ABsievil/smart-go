import { BaseResponseListDto } from '@common/dtos/base-response.list.dto';
import { UserGetResponseDto } from '@modules/users/dtos/response/user-get.response.dto';

export class UserListResponseDto extends BaseResponseListDto<UserGetResponseDto> {}
