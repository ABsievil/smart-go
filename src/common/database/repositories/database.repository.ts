import { Model, PopulateOptions, Document, PipelineStage } from 'mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';

export type IDatabaseDocument<T> = T & Document;

export interface FindOptions {
    sort?: Record<string, 1 | -1>;
    select?: string | Record<string, 0 | 1>;
    populate?: PopulateOptions | (string | PopulateOptions)[];
    lean?: boolean;
}

export interface FindAllOptions extends FindOptions {
    page?: number;
    limit?: number;
}

export class DBRepositoryBase<
    Entity extends DBEntityBase,
    EntityDocument extends IDatabaseDocument<Entity>,
> {
    protected readonly _repository: Model<Entity>;
    readonly _join?: PopulateOptions | (string | PopulateOptions)[];

    constructor(
        repository: Model<Entity>,
        options?: PopulateOptions | (string | PopulateOptions)[],
    ) {
        this._repository = repository;
        this._join = options;
    }

    /**
     * Find documents using aggregation pipeline
     */
    async find<T = Entity>(
        filter: Record<string, any> = {},
        options: FindOptions = {},
    ): Promise<T[]> {
        const pipeline: PipelineStage[] = [
            {
                $match: {
                    ...filter,
                    deleted: false,
                },
            },
        ];

        if (options.sort) {
            pipeline.push({ $sort: options.sort });
        }

        if (options.select) {
            const selectObj =
                typeof options.select === 'string'
                    ? options.select.split(' ').reduce(
                          (acc, field) => {
                              const isExclude = field.startsWith('-');
                              acc[isExclude ? field.slice(1) : field] =
                                  isExclude ? 0 : 1;
                              return acc;
                          },
                          {} as Record<string, 0 | 1>,
                      )
                    : options.select;
            pipeline.push({ $project: selectObj });
        }

        if (options.populate || this._join) {
            const populateOptions = options.populate || this._join;
            if (Array.isArray(populateOptions)) {
                populateOptions.forEach((pop) => {
                    if (typeof pop === 'string') {
                        pipeline.push({
                            $lookup: {
                                from: pop.toLowerCase() + 's',
                                localField: pop,
                                foreignField: '_id',
                                as: pop,
                            },
                        });
                    }
                });
            }
        }

        const results = await this._repository.aggregate(pipeline).exec();
        return (options.lean ? results : results.map((r) => r)) as T[];
    }

    /**
     * Find all documents with pagination using aggregation pipeline
     */
    async findAll<T = Entity>(
        filter: Record<string, any> = {},
        page: number = 1,
        limit: number = 10,
        options: FindOptions = {},
    ): Promise<{ data: T[]; total: number }> {
        const skip = (page - 1) * limit;

        const pipeline: PipelineStage[] = [
            {
                $match: {
                    ...filter,
                    deleted: false,
                },
            },
        ];

        if (options.sort) {
            pipeline.push({ $sort: options.sort });
        }

        // Count total before pagination
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await this._repository
            .aggregate(countPipeline)
            .exec();
        const total = countResult[0]?.total || 0;

        // Apply pagination
        pipeline.push({ $skip: skip }, { $limit: limit });

        if (options.select) {
            const selectObj =
                typeof options.select === 'string'
                    ? options.select.split(' ').reduce(
                          (acc, field) => {
                              const isExclude = field.startsWith('-');
                              acc[isExclude ? field.slice(1) : field] =
                                  isExclude ? 0 : 1;
                              return acc;
                          },
                          {} as Record<string, 0 | 1>,
                      )
                    : options.select;
            pipeline.push({ $project: selectObj });
        }

        if (options.populate || this._join) {
            const populateOptions = options.populate || this._join;
            if (Array.isArray(populateOptions)) {
                populateOptions.forEach((pop) => {
                    if (typeof pop === 'string') {
                        pipeline.push({
                            $lookup: {
                                from: pop.toLowerCase() + 's',
                                localField: pop,
                                foreignField: '_id',
                                as: pop,
                            },
                        });
                    }
                });
            }
        }

        const results = await this._repository.aggregate(pipeline).exec();
        return {
            data: (options.lean ? results : results.map((r) => r)) as T[],
            total,
        };
    }

    /**
     * Find one document by ID using aggregation pipeline
     */
    async findOneById<T = Entity>(
        id: string,
        options: FindOptions = {},
    ): Promise<T | null> {
        const pipeline: PipelineStage[] = [
            {
                $match: {
                    _id: id,
                    deleted: false,
                },
            },
        ];

        if (options.select) {
            const selectObj =
                typeof options.select === 'string'
                    ? options.select.split(' ').reduce(
                          (acc, field) => {
                              const isExclude = field.startsWith('-');
                              acc[isExclude ? field.slice(1) : field] =
                                  isExclude ? 0 : 1;
                              return acc;
                          },
                          {} as Record<string, 0 | 1>,
                      )
                    : options.select;
            pipeline.push({ $project: selectObj });
        }

        if (options.populate || this._join) {
            const populateOptions = options.populate || this._join;
            if (Array.isArray(populateOptions)) {
                populateOptions.forEach((pop) => {
                    if (typeof pop === 'string') {
                        pipeline.push({
                            $lookup: {
                                from: pop.toLowerCase() + 's',
                                localField: pop,
                                foreignField: '_id',
                                as: pop,
                            },
                        });
                    }
                });
            }
        }

        pipeline.push({ $limit: 1 });

        const results = await this._repository.aggregate(pipeline).exec();
        if (results.length === 0) {
            return null;
        }

        return (options.lean ? results[0] : results[0]) as T;
    }

    /**
     * Create a new document
     */
    async create<T = Entity>(data: Partial<Entity>): Promise<EntityDocument> {
        const newDoc = new this._repository({
            ...data,
            deleted: false,
        });
        return (await newDoc.save()) as EntityDocument;
    }

    /**
     * Update documents using aggregation pipeline
     */
    async update<T = Entity>(
        filter: Record<string, any>,
        data: Partial<Entity>,
    ): Promise<T | null> {
        const pipeline: PipelineStage[] = [
            {
                $match: {
                    ...filter,
                    deleted: false,
                },
            },
            {
                $limit: 1,
            },
        ];

        const results = await this._repository.aggregate(pipeline).exec();
        if (results.length === 0) {
            return null;
        }

        const doc = await this._repository.findById(results[0]._id);
        if (!doc) {
            return null;
        }

        Object.assign(doc, data, { updatedAt: new Date() });
        const updated = await doc.save();
        return updated as T;
    }

    /**
     * Soft delete documents
     */
    async delete(filter: Record<string, any>): Promise<boolean> {
        const result = await this._repository.updateMany(
            {
                ...filter,
                deleted: false,
            },
            {
                $set: {
                    deleted: true,
                    deletedAt: new Date(),
                },
            },
        );

        return result.modifiedCount > 0;
    }

    /**
     * Count documents
     */
    async count(filter: Record<string, any> = {}): Promise<number> {
        const pipeline: PipelineStage[] = [
            {
                $match: {
                    ...filter,
                    deleted: false,
                },
            },
            {
                $count: 'total',
            },
        ];

        const results = await this._repository.aggregate(pipeline).exec();
        return results[0]?.total || 0;
    }
}
