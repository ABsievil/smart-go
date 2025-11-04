import { Model, PopulateOptions } from "mongoose";
import { DatabaseEntityBase } from "./entities/database.entity";

export type IDatabaseDocument<T> = T & Document;

export class DatabaseRepositoryBase<
    Entity extends DatabaseEntityBase,
    EntityDocument extends IDatabaseDocument<Entity>,
> {
    protected readonly _repository: Model<Entity>;
    readonly _join?: PopulateOptions | (string | PopulateOptions)[];

    constructor(
        repository: Model<Entity>,
        options?: PopulateOptions | (string | PopulateOptions)[]
    ) {
        this._repository = repository;
        this._join = options;
    }
}