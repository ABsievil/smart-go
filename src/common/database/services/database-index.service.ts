import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DB_CONNECTION_NAME } from '@common/database/constants/database.constant';
import { DATABASE_INDEXES } from '@common/database/indexes/database-index.registry';
import {
    DatabaseIndexSpec,
    ModelIndexRegistration,
} from '@common/database/interfaces/database.interface';

/**
 * Đồng bộ tất cả compound / multi-field indexes khai báo tại
 * `database-index.registry` (`DATABASE_INDEXES`) với MongoDB khi ứng dụng bootstrap xong.
 *
 * Dùng `OnApplicationBootstrap` (chạy SAU khi tất cả module đã init)
 * để chắc chắn mọi `MongooseModule.forFeature(...)` đã đăng ký model
 * vào connection trước khi ta đọc `connection.models`.
 *
 * Quy trình cho từng model:
 *  1. Thêm các spec từ registry vào `schema` (bổ sung, không ghi đè).
 *  2. Gọi `model.syncIndexes()` — Mongoose sẽ TẠO index thiếu và
 *     XOÁ index cũ không còn khai báo trong schema.
 *
 * Nhờ vậy index luôn khớp registry, bất kể `autoIndex` bật hay tắt.
 */
@Injectable()
export class DatabaseIndexService implements OnApplicationBootstrap {
    private readonly logger = new Logger(DatabaseIndexService.name);

    constructor(
        @InjectConnection(DB_CONNECTION_NAME)
        private readonly connection: Connection,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        if (!DATABASE_INDEXES.length) {
            this.logger.log('No centralized indexes to sync — skipping.');
            return;
        }

        this.logger.log(
            `Syncing indexes for ${DATABASE_INDEXES.length} model(s)…`,
        );

        for (const registration of DATABASE_INDEXES) {
            await this.syncModelIndexes(registration);
        }

        this.logger.log('Centralized index sync completed.');
    }

    private async syncModelIndexes(
        registration: ModelIndexRegistration,
    ): Promise<void> {
        const { modelName, indexes } = registration;
        const model = this.connection.models[modelName];

        if (!model) {
            this.logger.warn(
                `Model "${modelName}" not found on connection — skipping (registered too early? wrong name?).`,
            );
            return;
        }

        for (const spec of indexes) {
            this.attachIndexSpec(model.schema, spec);
        }

        try {
            const dropped = await model.syncIndexes();
            const droppedList = this.formatDroppedIndexes(dropped);
            this.logger.log(
                `[${modelName}] synced ${indexes.length} spec(s); dropped stale: ${droppedList}`,
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[${modelName}] syncIndexes failed: ${msg}`);
        }
    }

    private attachIndexSpec(
        schema: Connection['models'][string]['schema'],
        spec: DatabaseIndexSpec,
    ): void {
        if (spec.options) {
            schema.index(spec.fields, spec.options);
        } else {
            schema.index(spec.fields);
        }
    }

    private formatDroppedIndexes(result: unknown): string {
        if (Array.isArray(result) && result.length) {
            return JSON.stringify(result);
        }
        return 'none';
    }
}
