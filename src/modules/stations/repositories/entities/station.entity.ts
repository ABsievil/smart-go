import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import { StationType } from '@modules/stations/enums/station.enum';
import { StationStatus } from '@modules/stations/enums/station.enum';

@Schema({ collection: 'stations', timestamps: true })
export class StationEntity extends DBEntityBase {
    @Prop({ required: true })
    stationName: string;

    @Prop({ required: true, unique: true })
    stationCode: string;

    @Prop({ required: true })
    address: string;

    @Prop({ required: false })
    url?: string;

    @Prop({
        required: true,
        type: String,
        enum: StationType,
    })
    stationType: StationType;

    @Prop({ required: true, type: Boolean, default: false })
    hasShelter: boolean;

    @Prop({ required: true, type: Boolean, default: false })
    hasWheelchair: boolean;

    @Prop({ required: true, type: Boolean, default: false })
    hasElevator: boolean;

    @Prop({ required: true, type: Boolean, default: false })
    hasRamp: boolean;

    @Prop({
        required: true,
        type: String,
        enum: StationStatus,
        default: StationStatus.ACTIVE,
    })
    status: StationStatus;

    @Prop({
        required: false,
        _id: false,
        type: {
            latitude: { type: Number, required: false },
            longitude: { type: Number, required: false },
        },
    })
    coordinates?: {
        latitude?: number;
        longitude?: number;
    };
}

export type StationDoc = IDatabaseDocument<StationEntity>;
export const StationSchema = SchemaFactory.createForClass(StationEntity);
