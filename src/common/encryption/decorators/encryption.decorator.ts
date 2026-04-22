import { SetMetadata } from '@nestjs/common';
import { ENCRYPTION_METADATA_KEY } from '@common/encryption/constants/encryption-metadata.constant';

export const Encryption = (enabled = true): MethodDecorator & ClassDecorator =>
    SetMetadata(ENCRYPTION_METADATA_KEY, enabled);
