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

        // Convert Map to plain object for routeForwardCodes
        if (raw.routeForwardCodes instanceof Map) {
            raw.routeForwardCodes = Object.fromEntries(raw.routeForwardCodes);
        }

        // Convert Map to plain object for routeBackwardCodes
        if (raw.routeBackwardCodes instanceof Map) {
            raw.routeBackwardCodes = Object.fromEntries(raw.routeBackwardCodes);
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

                // Convert Map to plain object for routeForwardCodes
                if (raw.routeForwardCodes instanceof Map) {
                    raw.routeForwardCodes = Object.fromEntries(
                        raw.routeForwardCodes,
                    );
                }

                // Convert Map to plain object for routeBackwardCodes
                if (raw.routeBackwardCodes instanceof Map) {
                    raw.routeBackwardCodes = Object.fromEntries(
                        raw.routeBackwardCodes,
                    );
                }

                return raw;
            }),
            {
                excludeExtraneousValues: true,
            },
        );
    }

    async create(createDto: RouteCreateRequestDto): Promise<RouteDoc> {
        const {
            operatingTime,
            routeForwardCodes,
            routeBackwardCodes,
            ...restDto
        } = createDto;

        const routeData: Partial<RouteEntity> = {
            ...restDto,
            status: createDto.status || undefined,
            operatingTime: operatingTime
                ? {
                      from: operatingTime.from || '',
                      to: operatingTime.to || '',
                  }
                : undefined,
            // Convert plain objects to Maps for routeForwardCodes and routeBackwardCodes
            routeForwardCodes: routeForwardCodes
                ? new Map(Object.entries(routeForwardCodes))
                : undefined,
            routeBackwardCodes: routeBackwardCodes
                ? new Map(Object.entries(routeBackwardCodes))
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
        const {
            operatingTime,
            routeForwardCodes,
            routeBackwardCodes,
            ...restDto
        } = updateDto;

        const updateData: Partial<RouteEntity> = {
            ...restDto,
        };

        if (operatingTime) {
            updateData.operatingTime = {
                from: operatingTime.from || '',
                to: operatingTime.to || '',
            };
        }

        if (routeForwardCodes !== undefined) {
            updateData.routeForwardCodes = new Map(
                Object.entries(routeForwardCodes),
            );
        }

        if (routeBackwardCodes !== undefined) {
            updateData.routeBackwardCodes = new Map(
                Object.entries(routeBackwardCodes),
            );
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
