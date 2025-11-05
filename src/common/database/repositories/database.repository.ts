import { Model, PopulateOptions, Document } from 'mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';

export type IDatabaseDocument<T> = T & Document;

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
}
