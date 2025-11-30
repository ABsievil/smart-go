import { ApiProperty } from '@nestjs/swagger';
import { RouteGetResponseDto } from './route-get.response.dto';
import { BaseResponseListDto } from '@common/dtos/base-response.list.dto';

export class RouteListResponseDto extends BaseResponseListDto<RouteGetResponseDto> {}
