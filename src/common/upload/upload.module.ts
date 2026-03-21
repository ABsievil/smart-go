import { Global, Module } from '@nestjs/common';
import { UploadService } from '@common/upload/services/upload.service';

@Global()
@Module({
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule {}
