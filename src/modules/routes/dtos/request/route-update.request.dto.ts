import {
    IsString,
    IsArray,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RouteCreateRequestDto } from './route-create.request.dto';
import { TransportType, RouteStatus } from '@modules/routes/enums/route.enum';

export class RouteUpdateRequestDto extends RouteCreateRequestDto {}
