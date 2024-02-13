import { Module } from '@nestjs/common';
import { CodeCompilerService } from './code-compiler.service';
import { CodeCompilerController } from './code-compiler.controller';

@Module({
  providers: [CodeCompilerService],
  controllers: [CodeCompilerController],
})
export class CodeCompilerModule {}
