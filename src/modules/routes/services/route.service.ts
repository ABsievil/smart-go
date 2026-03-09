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

        return plainToInstance(RouteGetResponseDto, raw, {
            excludeExtraneousValues: true,
        });
    }

    mapList(routes: RouteDoc[] | RouteEntity[]): RouteGetResponseDto[] {
        return plainToInstance(
            RouteGetResponseDto,
            routes.map((e: RouteDoc | RouteEntity) =>
                e instanceof Document ? e.toObject() : { ...e },
            ),
            { excludeExtraneousValues: true },
        );
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

    async create(createDto: RouteCreateRequestDto): Promise<RouteDoc> {
        const routeData = Object.assign(new RouteEntity(), createDto);

        return await this.routeRepository.create(routeData);
    }

    async update(
        id: string,
        updateDto: RouteUpdateRequestDto,
    ): Promise<RouteDoc> {
        const updateData = Object.assign(new RouteEntity(), updateDto);

        const updatedRoute = await this.routeRepository.update<RouteDoc>(
            { _id: id },
            updateData,
        );

        if (!updatedRoute) {
            throw new NotFoundException(`Route with ID ${id} not found`);
        }

        return updatedRoute;
    }

    async delete(id: string): Promise<void> {
        const deleted = await this.routeRepository.delete({ _id: id });

        if (!deleted) {
            throw new NotFoundException(`Route with ID ${id} not found`);
        }
    }
}
