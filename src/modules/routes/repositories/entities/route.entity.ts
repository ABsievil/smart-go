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
    operatorName?: string;

    // Ví dụ từ dataset: "ĐT: 028.3776.3777"
    @Prop({ required: false, type: String })
    phoneNumber?: string;

    // Ví dụ từ dataset: "50 chỗ", "60 chỗ", "47 - 50 chỗ"
    @Prop({ required: false, type: String })
    vehicleType?: string;

    @Prop({ required: false })
    startPoint?: string;

    @Prop({ required: false })
    endPoint?: string;

    // Ví dụ từ dataset: "15 - 18 phút"
    @Prop({ required: false, type: String })
    frequency: string;

    // Ví dụ từ dataset: ["Vé lượt trợ giá: 5,000 VNĐ", "Vé lượt trợ giá HSSV: 3,000 VNĐ", ...]
    @Prop({ required: false, type: [String] })
    baseFare: string[];

    // Ví dụ từ dataset: 8.59 (km)
    @Prop({ required: false, type: Number })
    totalDistance: number;

    @Prop({ required: false, type: Boolean, default: false })
    isWheelchairAccessible: boolean;

    @Prop({
        required: true,
        type: String,
        enum: RouteStatus,
        default: RouteStatus.ACTIVE,
    })
    status: RouteStatus;

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

    // Ví dụ từ dataset: "35 phút", "60 - 65 phút"
    @Prop({ required: false, type: String })
    tripTime?: string;

    // Ví dụ từ dataset: "120 chuyến/ngày", "260 chuyến/ngày"
    @Prop({ required: false, type: String })
    numTrips?: string;

    // Map<stationCode, distanceFromPrevious>
    @Prop({
        type: Map,
        of: String,
        default: {},
    })
    routeForwardCodes?: Map<string, string>;

    // Map<stationCode, distanceFromPrevious>
    @Prop({
        type: Map,
        of: String,
        default: {},
    })
    routeBackwardCodes?: Map<string, string>;
}

export type RouteDoc = IDatabaseDocument<RouteEntity>;
export const RouteSchema = SchemaFactory.createForClass(RouteEntity);
