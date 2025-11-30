import { ApiProperty } from '@nestjs/swagger';
import { StationGetResponseDto } from './station-get.response.dto';
import { BaseResponseListDto } from '@common/dtos/base-response.list.dto';

export class StationListResponseDto extends BaseResponseListDto<StationGetResponseDto> {}
