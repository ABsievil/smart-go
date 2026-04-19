import { IndexDefinition, IndexOptions } from 'mongoose';

/**
 * Định nghĩa một index đơn lẻ trên collection — khớp trực tiếp với
 * `Schema.prototype.index(fields, options)` của Mongoose.
 */
export interface DatabaseIndexSpec {
    fields: IndexDefinition;
    options?: IndexOptions;
}

/**
 * Khai báo danh sách index cần tồn tại trên collection của một model.
 *
 * `modelName` phải khớp `@Schema` name (thường là `EntityClass.name`)
 * đã đăng ký qua `MongooseModule.forFeature`.
 */
export interface ModelIndexRegistration {
    modelName: string;
    indexes: DatabaseIndexSpec[];
}
