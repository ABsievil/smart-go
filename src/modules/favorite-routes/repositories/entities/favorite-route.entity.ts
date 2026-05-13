import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';

/**
 * Bản ghi lộ trình yêu thích (điểm đi / điểm đến) — cùng ý nghĩa với
 * stationCode / coordinates trong RoutingRequestDto.
 */
@Schema({ collection: 'favorite_routes', timestamps: true })
export class FavoriteRouteEntity extends DBEntityBase {
    @Prop({ required: true, index: true })
    userId: string;

    @Prop({ required: true, type: String, trim: true })
    routeName: string;

    @Prop({
        required: false,
        type: {
            from: { type: String, required: false },
            to: { type: String, required: false },
        },
    })
    stationCode?: {
        from?: string;
        to?: string;
    };

    @Prop({
        required: false,
        type: {
            from: {
                latitude: { type: Number, required: false },
                longitude: { type: Number, required: false },
            },
            to: {
                latitude: { type: Number, required: false },
                longitude: { type: Number, required: false },
            },
        },
    })
    coordinates?: {
        from?: { latitude: number; longitude: number };
        to?: { latitude: number; longitude: number };
    };
}

export type FavoriteRouteDoc = IDatabaseDocument<FavoriteRouteEntity>;
export const FavoriteRouteSchema =
    SchemaFactory.createForClass(FavoriteRouteEntity);
