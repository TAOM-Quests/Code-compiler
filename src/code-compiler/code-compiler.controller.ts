import { Controller, Post, Body } from '@nestjs/common';
import { CodeCompilerService } from './code-compiler.service';

@Controller('compiler')
export class CodeCompilerController {
  constructor(private readonly codeCompilerService: CodeCompilerService) {}

  @Post('execute')
  async executeCode(
    @Body() requestBody: { language: string; code: string; input: string[] },
  ): Promise<string> {
    const { language, code, input } = requestBody;
    return this.codeCompilerService.compileAndExecute(language, code, input);
  }
}
