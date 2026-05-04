import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import {
    TransportType,
    RouteStatus,
    RouteType,
} from '@modules/routes/enums/route.enum';

@Schema({ collection: 'routes_V3', timestamps: true })
export class RouteEntity extends DBEntityBase {
    /* Route */
    @Prop({ required: false, type: String })
    routeKey?: string;

    @Prop({ required: true })
    routeCode: string;

    @Prop({ required: true, type: String })
    routeName: string;

    @Prop({ required: false, type: String })
    routeVarShortName?: string;

    @Prop({ required: false })
    startPoint?: string;

    @Prop({ required: false })
    endPoint?: string;

    @Prop({ required: false, type: Boolean })
    isOutbound?: boolean;

    @Prop({ required: false, type: String })
    runningTime?: string;

    /* Route Detail */
    @Prop({ required: false })
    operatorName?: string;

    @Prop({
        required: true,
        type: String,
        enum: TransportType,
    })
    transportType: TransportType;

    @Prop({
        required: true,
        type: String,
        enum: RouteType,
        default: RouteType.BUS,
    })
    routeType: RouteType;

    @Prop({ required: false, type: Number })
    totalDistance: number;

    @Prop({ required: false, type: String })
    vehicleType?: string;

    @Prop({ required: false, type: String })
    operatingTimeStart?: string;

    @Prop({ required: false, type: String })
    operatingTimeEnd?: string;

    @Prop({ required: false, type: String })
    phoneNumber?: string;

    @Prop({ required: false, type: [String] })
    baseFare: string[];

    @Prop({ required: false, type: String })
    numTrips?: string;

    @Prop({ required: false, type: String })
    tripTime?: string;

    @Prop({ required: false, type: String })
    frequency: string;

    @Prop({
        required: true,
        type: String,
        enum: RouteStatus,
        default: RouteStatus.ACTIVE,
    })
    status: RouteStatus;

    @Prop({ required: false, type: [String] })
    stationIds: string[];
}

export type RouteDoc = IDatabaseDocument<RouteEntity>;
export const RouteSchema = SchemaFactory.createForClass(RouteEntity);
