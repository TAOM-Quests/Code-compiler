import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as edge from 'edge-js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';

@Injectable()
export class CodeCompilerService {
  async compileAndExecute(language: string, code: string): Promise<string> {
    switch (language.toLowerCase()) {
      case 'javascript':
        return this.executeJavaScript(code);
      case 'python':
        return this.executePython(code);
      case 'csharp':
        return this.executeCSharp(code);
      case 'java':
        return this.executeJava(code);
      default:
        return Promise.reject('Unsupported language');
    }
  }

  private executeJavaScript(code: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const childProcess = spawn('node', ['-e', code]);

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      childProcess.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve(output);
        } else {
          reject(error || 'Code execution failed');
        }
      });
    });
  }

  private executePython(code: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const childProcess = spawn('python', ['-c', code]);

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      childProcess.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve(output);
        } else {
          reject(error || 'Code execution failed');
        }
      });
    });
  }

  private executeCSharp(code: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const csharpFunc = edge.func(`
        async (input) => {
          var originalConsoleOut = Console.Out;

          using (var stringWriter = new System.IO.StringWriter())
          {
              Console.SetOut(stringWriter);
  
              ${code}
  
              string consoleOutput = stringWriter.ToString();
  
              Console.SetOut(originalConsoleOut);
  
              return consoleOutput;
          }
        }
      `);

      csharpFunc(null, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.toString());
        }
      });
    });
  }

  private async executeJava(code: string): Promise<string> {
    try {
      const folderName = uuidv4();

      await mkdir(folderName);

      const fileName = `${uuidv4()}.java`;

      const filePath = join(folderName, fileName);
      await writeFile(filePath, code);

      const className = this.extractClassName(code);

      const compileResult = await this.compileJava(filePath);

      if (compileResult.stderr) {
        return compileResult.stderr;
      }

      const executionResult = await this.executeJavaProgram(
        folderName,
        className,
      );

      await rm(folderName, { recursive: true });

      return executionResult;
    } catch (error) {
      return error.message;
    }
  }

  private compileJava(
    filePath: string,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        const childProcess = spawn('javac', [filePath]);

        let stderr = '';

        childProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        childProcess.on('close', (exitCode) => {
          if (exitCode === 0) {
            resolve({ stdout: '', stderr });
          } else {
            reject({ stdout: '', stderr });
          }
        });
      },
    );
  }

  private executeJavaProgram(
    folderName: string,
    className: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const childProcess = spawn('java', ['-cp', folderName, className]);

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      childProcess.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve(output);
        } else {
          reject(error || 'Code execution failed');
        }
      });
    });
  }

  private extractClassName(code: string): string {
    const classRegex = /class\s+([A-Za-z_$][A-Za-z\d_$]*)/;
    const match = code.match(classRegex);
    return match ? match[1] : 'Main';
  }
}
