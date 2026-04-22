import { SetMetadata } from '@nestjs/common';
import { DECRYPTION_METADATA_KEY } from '@common/encryption/constants/encryption-metadata.constant';

export const Decryption = (enabled = true): MethodDecorator & ClassDecorator =>
    SetMetadata(DECRYPTION_METADATA_KEY, enabled);
