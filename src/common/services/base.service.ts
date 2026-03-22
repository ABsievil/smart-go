import { NotFoundException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import {
    DBRepositoryBase,
    FindOptions,
    IDatabaseDocument,
} from '@common/database/repositories/database.repository';
import { OrderDirection } from '@common/database/enums/order-direction.enum';
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
        repositoryOptions: FindOptions = {},
        search?: string,
        orderBy?: string,
        orderDirection: OrderDirection = OrderDirection.ASC,
        searchFields?: string[],
    ): Promise<{ data: TEntity[]; total: number }> {
        const sort: FindOptions['sort'] = {
            ...repositoryOptions.sort,
            ...(orderBy
                ? {
                      [orderBy]:
                          orderDirection === OrderDirection.DESC ? -1 : 1,
                  }
                : {}),
        };

        const options: FindOptions = {
            ...repositoryOptions,
            lean: true,
            ...(search !== undefined && search !== ''
                ? { search, searchFields }
                : {}),
            ...(Object.keys(sort ?? {}).length ? { sort } : {}),
        };

        const countOptions: Pick<FindOptions, 'search' | 'searchFields'> = {
            ...(search !== undefined && search !== ''
                ? { search, searchFields }
                : {}),
        };

        if (page === undefined && limit === undefined) {
            const [data, total] = await Promise.all([
                this.repository.find<TEntity>(filter, options),
                this.repository.count(filter, countOptions),
            ]);
            return { data, total };
        }

        const { data, total } = await this.repository.findAll<TEntity>(
            filter,
            page ?? 1,
            limit ?? 10,
            options,
        );

        return { data, total };
    }

    async findOne(
        id: string,
        filter: Record<string, any> = {},
        repositoryOptions: FindOptions = {},
    ): Promise<TEntity> {
        const entity = await this.repository.findOneById<TEntity>(
            id,
            { ...repositoryOptions, lean: true },
            filter,
        );

        if (!entity) {
            throw new NotFoundException(`Resource with ID ${id} not found`);
        }

        return entity;
    }

    async create(createDto: TCreateRequestDto): Promise<TDoc> {
        const entityData = Object.assign(new this.entityClass(), createDto);

        return await this.repository.create(entityData);
    }

    async update(
        id: string,
        updateDto: TUpdateRequestDto,
        filter: Record<string, any> = {},
    ): Promise<TDoc> {
        const updateData = Object.assign(new this.entityClass(), updateDto);

        const updated = await this.repository.update<TDoc>(
            { ...filter, _id: id },
            updateData,
        );

        if (!updated) {
            throw new NotFoundException(`Resource with ID ${id} not found`);
        }

        return updated;
    }

    async delete(id: string, filter: Record<string, any> = {}): Promise<void> {
        const deleted = await this.repository.delete({ ...filter, _id: id });

        if (!deleted) {
            throw new NotFoundException(`Resource with ID ${id} not found`);
        }
    }
}
