import { MessageEntity } from '@modules/messages/repositories/entities/message.entity';
import { RouteEntity } from '@modules/routes/repositories/entities/route.entity';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';
import { ModelIndexRegistration } from '@common/database/interfaces/database.interface';

/**
 * @description Central registry — nơi DUY NHẤT khai báo compound / multi-field
 * indexes của hệ thống.
 *
 * Các single-field index đơn giản (`@Prop({ index: true })`) vẫn được
 * giữ tại entity vì tính colocated với field. Những index phức tạp
 * hoặc xuyên nhiều field nên khai báo ở đây để:
 *  - tránh rải rác `Schema.index(...)` khắp các entity
 *  - có chỗ review tập trung khi tối ưu query
 *  - đảm bảo được đồng bộ xuống MongoDB qua `DatabaseIndexService`
 *    (ngay cả khi `autoIndex` bị tắt hoặc index trước đó đã khác schema).
 */
export const DATABASE_INDEXES: ModelIndexRegistration[] = [
    {
        modelName: MessageEntity.name,
        indexes: [
            {
                fields: {
                    conversationId: 1,
                    userId: 1,
                    deleted: 1,
                    createdAt: -1,
                },
                options: { name: 'idx_messages_conv_user_deleted_created' },
            },
        ],
    },
    {
        modelName: RouteEntity.name,
        indexes: [
            {
                fields: { createdAt: 1 },
                options: {
                    name: 'idx_routes_active_created_partial',
                    partialFilterExpression: { deleted: false },
                },
            },
        ],
    },
    {
        modelName: StationEntity.name,
        indexes: [
            {
                fields: { createdAt: 1 },
                options: {
                    name: 'idx_stations_active_created_partial',
                    partialFilterExpression: { deleted: false },
                },
            },
        ],
    },
];
