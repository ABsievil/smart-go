import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true })
export class UserEntity {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    name: string;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);