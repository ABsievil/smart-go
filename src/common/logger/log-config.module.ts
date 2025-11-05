import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogConfigService } from '@common/logger/log-config.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [LogConfigService],
    exports: [LogConfigService],
})
export class LogConfigModule {}
