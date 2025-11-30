import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import { RouteRepository } from '@modules/routes/repositories/repository/route.repository';
import {
    RouteEntity,
    RouteDoc,
} from '@modules/routes/repositories/entities/route.entity';
import { RouteCreateRequestDto } from '@modules/routes/dtos/request/route-create.request.dto';
import { RouteUpdateRequestDto } from '@modules/routes/dtos/request/route-update.request.dto';
import { RouteGetResponseDto } from '@modules/routes/dtos/response/route-get.response.dto';

@Injectable()
export class RouteService {
    constructor(private readonly routeRepository: RouteRepository) {}

    mapGet(route: RouteDoc | RouteEntity): RouteGetResponseDto {
        const raw = route instanceof Document ? route.toObject() : { ...route };

        // Convert Map to plain object for stationIds
        if (raw.stationIds instanceof Map) {
            raw.stationIds = Object.fromEntries(raw.stationIds);
        }

        return plainToInstance(RouteGetResponseDto, raw, {
            excludeExtraneousValues: true,
        });
    }

    mapList(routes: RouteDoc[] | RouteEntity[]): RouteGetResponseDto[] {
        return plainToInstance(
            RouteGetResponseDto,
            routes.map((e: RouteDoc | RouteEntity) => {
                const raw = e instanceof Document ? e.toObject() : { ...e };

                // Convert Map to plain object for stationIds
                if (raw.stationIds instanceof Map) {
                    raw.stationIds = Object.fromEntries(raw.stationIds);
                }

                return raw;
            }),
            {
                excludeExtraneousValues: true,
            },
        );
    }

    async create(createDto: RouteCreateRequestDto): Promise<RouteDoc> {
        const routeData: Partial<RouteEntity> = {
            ...createDto,
            stationIds: createDto.stationIds
                ? new Map(Object.entries(createDto.stationIds))
                : new Map(),
            operatingTime: createDto.operatingTime
                ? {
                      from: createDto.operatingTime.from || '',
                      to: createDto.operatingTime.to || '',
                  }
                : undefined,
        };

        return await this.routeRepository.create(routeData);
    }

    async findAll(
        filter: Record<string, any> = {},
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: RouteEntity[]; total: number }> {
        const { data, total } = await this.routeRepository.findAll<RouteEntity>(
            filter,
            page,
            limit,
            { lean: true },
        );

        return { data, total };
    }

    async findOne(id: string): Promise<RouteEntity> {
        const route = await this.routeRepository.findOneById<RouteEntity>(id, {
            lean: true,
        });

        if (!route) {
            throw new NotFoundException(`Route with ID ${id} not found`);
        }

        return route;
    }

    async findByCode(routeCode: string): Promise<RouteEntity> {
        const routes = await this.routeRepository.find<RouteEntity>(
            { routeCode },
            { lean: true },
        );

        if (routes.length === 0) {
            throw new NotFoundException(
                `Route with code ${routeCode} not found`,
            );
        }

        return routes[0];
    }

    async update(
        id: string,
        updateDto: RouteUpdateRequestDto,
    ): Promise<RouteDoc> {
        const { operatingTime, stationIds, ...restDto } = updateDto;
        const updateData: Partial<RouteEntity> = {
            ...restDto,
        };

        if (stationIds) {
            updateData.stationIds = new Map(Object.entries(stationIds));
        }

        if (operatingTime) {
            updateData.operatingTime = {
                from: operatingTime.from || '',
                to: operatingTime.to || '',
            };
        }

        const updatedRoute = await this.routeRepository.update<RouteDoc>(
            { _id: id },
            updateData,
        );

        if (!updatedRoute) {
            throw new NotFoundException(`Route with ID ${id} not found`);
        }

        return updatedRoute;
    }

    async remove(id: string): Promise<void> {
        const deleted = await this.routeRepository.delete({ _id: id });

        if (!deleted) {
            throw new NotFoundException(`Route with ID ${id} not found`);
        }
    }
}
