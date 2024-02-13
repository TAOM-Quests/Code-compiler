import { Controller, Post, Body } from '@nestjs/common';
import { CodeCompilerService } from './code-compiler.service';

@Controller('compiler')
export class CodeCompilerController {
  constructor(private readonly codeCompilerService: CodeCompilerService) {}

  @Post('execute')
  async executeCode(
    @Body() requestBody: { language: string; code: string },
  ): Promise<string> {
    const { language, code } = requestBody;
    return this.codeCompilerService.compileAndExecute(language, code);
  }
}
