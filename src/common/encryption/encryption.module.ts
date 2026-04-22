import { Global, Module } from '@nestjs/common';
import { EncryptionService } from '@common/encryption/services/encryption.service';
import { ResponseEncryptionInterceptor } from '@common/encryption/interceptors/response-encryption.interceptor';

@Global()
@Module({
    providers: [EncryptionService, ResponseEncryptionInterceptor],
    exports: [EncryptionService, ResponseEncryptionInterceptor],
})
export class EncryptionModule {}
