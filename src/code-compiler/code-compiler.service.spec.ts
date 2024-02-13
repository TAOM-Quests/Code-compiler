import { Test, TestingModule } from '@nestjs/testing';
import { CodeCompilerService } from './code-compiler.service';

describe('CodeCompilerService', () => {
  let service: CodeCompilerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeCompilerService],
    }).compile();

    service = module.get<CodeCompilerService>(CodeCompilerService);
  });

  it('should compile and execute JavaScript code', async () => {
    const language = 'python';
    const code = 'print("23")';

    const result = await service.compileAndExecute(language, code);

    expect(result).toContain('23');
  });
});
