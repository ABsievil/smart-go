import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import { TransportType, RouteStatus } from '@modules/routes/enums/route.enum';

@Schema({ collection: 'routes', timestamps: true })
export class RouteEntity extends DBEntityBase {
    @Prop({ required: true, unique: true })
    routeCode: string;

    @Prop({ required: true, type: String })
    routeName: string;

    @Prop({
        required: true,
        type: String,
        enum: TransportType,
    })
    transportType: TransportType;

    @Prop({ required: false })
    startPoint?: string;

    @Prop({ required: false })
    endPoint?: string;

    @Prop({ required: true, type: Number })
    frequency: number;

    @Prop({ required: true, type: Number })
    baseFare: number;

    @Prop({ required: true, type: Number })
    totalDistance: number;

    @Prop({ required: true, type: Boolean, default: false })
    isWheelchairAccessible: boolean;

    @Prop({
        required: true,
        type: String,
        enum: RouteStatus,
        default: RouteStatus.ACTIVE,
    })
    status: RouteStatus;

    @Prop({ required: false, type: Number })
    distance?: number;

    @Prop({
        type: {
            from: { type: String, required: false },
            to: { type: String, required: false },
        },
        required: false,
        _id: false,
    })
    operatingTime?: {
        from: string;
        to: string;
    };

    @Prop({ required: false, type: Number })
    tripTime?: number;

    @Prop({
        type: {
            from: { type: Number, required: false },
            to: { type: Number, required: false },
        },
        required: false,
        _id: false,
    })
    frequencyOfEachTrip?: {
        from?: number;
        to?: number;
    };

    @Prop({ required: false })
    operatorName?: string;

    @Prop({ required: false, type: [String], default: [] })
    paymentMethods?: string[];

    @Prop({ required: false })
    note?: string;

    @Prop({
        type: Map,
        of: String,
        default: {},
    })
    stationIds: Map<string, string>;
}

export type RouteDoc = IDatabaseDocument<RouteEntity>;
export const RouteSchema = SchemaFactory.createForClass(RouteEntity);
