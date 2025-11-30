import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import { TransportType, RouteStatus } from '@modules/routes/enums/route.enum';

@Schema({ collection: 'routes', timestamps: true })
export class RouteEntity extends DBEntityBase {
    @Prop({ required: true, unique: true })
    routeNumber: string;

    @Prop({ required: true })
    routeName: string;

    @Prop({
        required: true,
        type: String,
        enum: TransportType,
    })
    transportType: TransportType;

    @Prop({ required: true })
    startPoint: string;

    @Prop({ required: true })
    endPoint: string;

    @Prop({ required: true, type: String })
    operatingHoursStart: string;

    @Prop({ required: true, type: String })
    operatingHoursEnd: string;

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

    @Prop({
        type: Map,
        of: Number,
        default: {},
    })
    stationIds: Map<string, number>;
}

export type RouteDoc = IDatabaseDocument<RouteEntity>;
export const RouteSchema = SchemaFactory.createForClass(RouteEntity);
