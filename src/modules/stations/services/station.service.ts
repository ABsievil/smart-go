import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import {
    StationEntity,
    StationDoc,
} from '@modules/stations/repositories/entities/station.entity';
import { StationCreateRequestDto } from '@modules/stations/dtos/request/station-create.request.dto';
import { StationUpdateRequestDto } from '@modules/stations/dtos/request/station-update.request.dto';
import { StationGetResponseDto } from '@modules/stations/dtos/response/station-get.response.dto';

@Injectable()
export class StationService {
    constructor(private readonly stationRepository: StationRepository) {}

    mapGet(station: StationDoc | StationEntity): StationGetResponseDto {
        const raw =
            station instanceof Document ? station.toObject() : { ...station };

        return plainToInstance(StationGetResponseDto, raw, {
            excludeExtraneousValues: true,
        });
    }

    mapList(stations: StationDoc[] | StationEntity[]): StationGetResponseDto[] {
        return plainToInstance(
            StationGetResponseDto,
            stations.map((e: StationDoc | StationEntity) =>
                e instanceof Document ? e.toObject() : { ...e },
            ),
            { excludeExtraneousValues: true },
        );
    }

    async findAll(
        filter: Record<string, any> = {},
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: StationEntity[]; total: number }> {
        const { data, total } =
            await this.stationRepository.findAll<StationEntity>(
                filter,
                page,
                limit,
                { lean: true },
            );

        return { data, total };
    }

    async findOne(id: string): Promise<StationEntity> {
        const station = await this.stationRepository.findOneById<StationEntity>(
            id,
            { lean: true },
        );

        if (!station) {
            throw new NotFoundException(`Station with ID ${id} not found`);
        }

        return station;
    }

    async create(createDto: StationCreateRequestDto): Promise<StationDoc> {
        const stationData = Object.assign(new StationEntity(), createDto);

        return await this.stationRepository.create(stationData);
    }

    async update(
        id: string,
        updateDto: StationUpdateRequestDto,
    ): Promise<StationDoc> {
        const updateData = Object.assign(new StationEntity(), updateDto);

        const updatedStation = await this.stationRepository.update<StationDoc>(
            { _id: id },
            updateData,
        );

        if (!updatedStation) {
            throw new NotFoundException(`Station with ID ${id} not found`);
        }

        return updatedStation;
    }

    async delete(id: string): Promise<void> {
        const deleted = await this.stationRepository.delete({ _id: id });

        if (!deleted) {
            throw new NotFoundException(`Station with ID ${id} not found`);
        }
    }
}
