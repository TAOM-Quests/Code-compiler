import { Test, TestingModule } from '@nestjs/testing';
import { CodeCompilerController } from './code-compiler.controller';

describe('CodeCompilerController', () => {
  let controller: CodeCompilerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodeCompilerController],
    }).compile();

    controller = module.get<CodeCompilerController>(CodeCompilerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
