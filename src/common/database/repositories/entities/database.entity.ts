import { v4 as uuidV4 } from 'uuid';
import {Prop} from '@nestjs/mongoose';

export class DatabaseEntityBase {
    @Prop({
        type: String,
        default: uuidV4,
    })
    _id: string;

    @Prop({
        required: true,
        index: true,
        default: false,
    })
    deleted: boolean;

    @Prop({
        required: false,
        index: 'asc',
        type: Date,
        // default: new Date(),
    })
    createdAt?: Date;

    @Prop({
        required: false,
        index: true,
    })
    createdBy?: string;

    @Prop({
        required: false,
        index: 'asc',
        type: Date,
        // default: new Date(),
    })
    updatedAt?: Date;

    @Prop({
        required: false,
        index: true,
    })
    updatedBy?: string;

    @Prop({
        required: false,
        index: true,
        type: Date,
    })
    deletedAt?: Date;

    @Prop({
        required: false,
        index: true,
    })
    deletedBy?: string;
}
