import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import { StationType } from '@modules/stations/enums/station.enum';
import { StationStatus } from '@modules/stations/enums/station.enum';

@Schema({ collection: 'stations_V3', timestamps: true })
export class StationEntity extends DBEntityBase {
    @Prop({ required: true, unique: true })
    stationCode: string;

    @Prop({ required: false })
    stationName?: string;

    @Prop({
        required: true,
        type: Number,
    })
    latitude: number;

    @Prop({
        required: true,
        type: Number,
    })
    longitude: number;

    @Prop({ required: false })
    condition: string;

    @Prop({ required: false })
    stopCategory: string;

    @Prop({ required: false })
    streetName: string;

    @Prop({ required: false })
    addressNo: string;

    @Prop({ required: false, type: Boolean, default: false })
    hasWheelchair: boolean;

    @Prop({ required: false, type: Boolean, default: false })
    hasRamp: boolean;

    @Prop({
        required: true,
        type: String,
        enum: StationType,
    })
    stationType: StationType;

    @Prop({
        required: true,
        type: String,
        enum: StationStatus,
        default: StationStatus.ACTIVE,
    })
    status: StationStatus;

    // @Prop({ required: false })
    // url?: string;

    // @Prop({ required: true, type: Boolean, default: false })
    // hasShelter: boolean;

    // @Prop({ required: true, type: Boolean, default: false })
    // hasElevator: boolean;
}

export type StationDoc = IDatabaseDocument<StationEntity>;
export const StationSchema = SchemaFactory.createForClass(StationEntity);
