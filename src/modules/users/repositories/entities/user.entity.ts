import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DBEntityBase } from 'src/common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from 'src/common/database/repositories/database.repository';

@Schema({ collection: 'users', timestamps: true })
export class UserEntity extends DBEntityBase {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    name: string;
}

export type UserDoc = IDatabaseDocument<UserEntity>;
export const UserSchema = SchemaFactory.createForClass(UserEntity);
