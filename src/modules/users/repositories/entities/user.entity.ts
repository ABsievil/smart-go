import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import { UserRole } from '@modules/users/enums/user-role.enum';

@Schema({ collection: 'users', timestamps: true })
export class UserEntity extends DBEntityBase {
    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: true })
    password: string;

    @Prop({
        required: true,
        type: String,
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;
}

export type UserDoc = IDatabaseDocument<UserEntity>;
export const UserSchema = SchemaFactory.createForClass(UserEntity);
