import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CodeCompilerModule } from './code-compiler/code-compiler.module';

@Module({
  imports: [CodeCompilerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
