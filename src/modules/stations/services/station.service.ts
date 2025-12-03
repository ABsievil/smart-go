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
        return plainToInstance(
            StationGetResponseDto,
            station instanceof Document ? station.toObject() : { ...station },
            {
                excludeExtraneousValues: true,
            },
        );
    }

    mapList(stations: StationDoc[] | StationEntity[]): StationGetResponseDto[] {
        return plainToInstance(
            StationGetResponseDto,
            stations.map((e: StationDoc | StationEntity) => {
                const raw = e instanceof Document ? e.toObject() : { ...e };
                return raw;
            }),
            {
                excludeExtraneousValues: true,
            },
        );
    }

    async create(createDto: StationCreateRequestDto): Promise<StationDoc> {
        return await this.stationRepository.create(createDto);
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

    async findByCode(stationCode: string): Promise<StationEntity> {
        const stations = await this.stationRepository.find<StationEntity>(
            { stationCode },
            { lean: true },
        );

        if (stations.length === 0) {
            throw new NotFoundException(
                `Station with code ${stationCode} not found`,
            );
        }

        return stations[0];
    }

    async findByCodes(stationCodes: string[]): Promise<StationEntity[]> {
        if (!stationCodes.length) return [];

        return this.stationRepository.find<StationEntity>(
            { stationCode: { $in: stationCodes } },
            { lean: true },
        );
    }

    async update(
        id: string,
        updateDto: StationUpdateRequestDto,
    ): Promise<StationDoc> {
        const updatedStation = await this.stationRepository.update<StationDoc>(
            { _id: id },
            updateDto,
        );

        if (!updatedStation) {
            throw new NotFoundException(`Station with ID ${id} not found`);
        }

        return updatedStation;
    }

    async remove(id: string): Promise<void> {
        const deleted = await this.stationRepository.delete({ _id: id });

        if (!deleted) {
            throw new NotFoundException(`Station with ID ${id} not found`);
        }
    }
}
