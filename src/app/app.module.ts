import { Module } from '@nestjs/common';
import { RouterModule } from 'src/routers/router.module';

@Module({
  imports: [RouterModule],
})
export class AppModule {}
