import { Global, Module } from '@nestjs/common';
import { DatabaseIndexService } from '@common/database/services/database-index.service';

@Global()
@Module({
    providers: [DatabaseIndexService],
    exports: [DatabaseIndexService],
})
export class DatabaseModule {}
