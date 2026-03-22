import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DBEntityBase } from '@common/database/repositories/entities/database.entity';
import { IDatabaseDocument } from '@common/database/repositories/database.repository';
import { UserRole } from '@modules/users/enums/user-role.enum';

@Schema({ collection: 'messages', timestamps: true })
export class MessageEntity extends DBEntityBase {
    @Prop({ required: true, index: true, trim: true })
    conversationId: string;

    @Prop({ required: true, index: true })
    userId: string;

    @Prop({
        required: true,
        type: String,
        enum: UserRole,
    })
    role: UserRole;

    @Prop({ required: true, trim: true })
    content: string;

    /** Tuỳ chọn: model, token usage, citations, v.v. */
    @Prop({ required: false, type: Object })
    metadata?: Record<string, unknown>;
}

export type MessageDoc = IDatabaseDocument<MessageEntity>;
export const MessageSchema = SchemaFactory.createForClass(MessageEntity);
