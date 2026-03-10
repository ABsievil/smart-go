import { NotFoundException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import {
    DBRepositoryBase,
    IDatabaseDocument,
} from '@common/database/repositories/database.repository';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';

export abstract class BaseService<
    TEntity extends DBEntityBase,
    TDoc extends IDatabaseDocument<TEntity>,
    TGetResponseDto,
    TCreateRequestDto,
    TUpdateRequestDto,
    TRepository extends DBRepositoryBase<TEntity, TDoc>,
> {
    protected constructor(
        protected readonly repository: TRepository,
        private readonly entityClass: new () => TEntity,
        private readonly getResponseDto: ClassConstructor<TGetResponseDto>,
        private readonly notFoundResourceName: string,
    ) {}

    mapGet(item: TDoc | TEntity): TGetResponseDto {
        const raw =
            item instanceof Document ? item.toObject() : ({ ...item } as any);

        return plainToInstance(this.getResponseDto, raw, {
            excludeExtraneousValues: true,
        });
    }

    mapList(items: (TDoc | TEntity)[]): TGetResponseDto[] {
        const rawItems = items.map((item) =>
            item instanceof Document ? item.toObject() : ({ ...item } as any),
        );

        return plainToInstance(this.getResponseDto, rawItems, {
            excludeExtraneousValues: true,
        });
    }

    async findAll(
        filter: Record<string, any> = {},
        page?: number,
        limit?: number,
    ): Promise<{ data: TEntity[]; total: number }> {
        if (page === undefined && limit === undefined) {
            const [data, total] = await Promise.all([
                this.repository.find<TEntity>(filter, { lean: true }),
                this.repository.count(filter),
            ]);
            return { data, total };
        }

        const { data, total } = await this.repository.findAll<TEntity>(
            filter,
            page ?? 1,
            limit ?? 10,
            { lean: true },
        );

        return { data, total };
    }

    async findOne(id: string): Promise<TEntity> {
        const entity = await this.repository.findOneById<TEntity>(id, {
            lean: true,
        });

        if (!entity) {
            throw new NotFoundException(
                `${this.notFoundResourceName} with ID ${id} not found`,
            );
        }

        return entity;
    }

    async create(createDto: TCreateRequestDto): Promise<TDoc> {
        const entityData = Object.assign(new this.entityClass(), createDto);

        return await this.repository.create(entityData);
    }

    async update(id: string, updateDto: TUpdateRequestDto): Promise<TDoc> {
        const updateData = Object.assign(new this.entityClass(), updateDto);

        const updated = await this.repository.update<TDoc>(
            { _id: id },
            updateData,
        );

        if (!updated) {
            throw new NotFoundException(
                `${this.notFoundResourceName} with ID ${id} not found`,
            );
        }

        return updated;
    }

    async delete(id: string): Promise<void> {
        const deleted = await this.repository.delete({ _id: id });

        if (!deleted) {
            throw new NotFoundException(
                `${this.notFoundResourceName} with ID ${id} not found`,
            );
        }
    }
}
