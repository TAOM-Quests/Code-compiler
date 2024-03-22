import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { writeFile, mkdir, rm, rename } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import * as iconv from 'iconv-lite';

@Injectable()
export class CodeCompilerService {
  async compileAndExecute(
    language: string,
    code: string,
    input: string[] = [''],
  ): Promise<string> {
    try {
      switch (language.toLowerCase()) {
        case 'javascript':
          return this.executeVariousLanguages(code, 'node', 'utf-8', [
            '-e',
            code,
          ]);
        case 'python':
          return this.executeVariousLanguages(code, 'python', 'Windows-1251', [
            '-c',
            code,
          ]);
        case 'csharp':
          return this.executeCS(code, input);
        case 'java':
          return this.executeJava(code);
        case 'cpp':
          return this.executeCpp(code);
        default:
          return Promise.reject('Unsupported language');
      }
    } catch (error) {
      return error.message;
    }
  }

  private async executeVariousLanguages(
    code: string,
    interpreter: string,
    encoding: string,
    args: string[],
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const childProcess = spawn(interpreter, args);

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += iconv.decode(Buffer.from(data), encoding);
      });

      childProcess.stderr.on('data', (data) => {
        error += iconv.decode(Buffer.from(data), encoding);
      });

      childProcess.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve(output);
        } else {
          reject(error || 'Code execution failed');
        }
      });

      childProcess.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async executeJava(code: string): Promise<string> {
    const folderName = uuidv4();
    try {
      const structuredCode = this.wrapJavaCode(code);

      await mkdir(folderName);

      const fileName = `${uuidv4()}.java`;

      const filePath = join(folderName, fileName);
      await writeFile(filePath, structuredCode);

      const className = this.extractClassName(code);

      const compileResult = await this.compileCode('javac', 'Windows-1251', [
        filePath,
      ]);

      if (compileResult.stderr) {
        return compileResult.stderr;
      }

      const executionResult = await this.executeJavaProgram(
        folderName,
        className,
      );

      return executionResult;
    } catch (error) {
      const errorMessage = error.stdout
        ? error.stdout.toString('utf-8')
        : error.stderr
          ? error.stderr.toString('utf-8')
          : error.message
            ? error.message
            : 'Unknown error occurred';
      return errorMessage;
    } finally {
      await rm(folderName, { recursive: true });
    }
  }
  private async executeCpp(code: string): Promise<string> {
    const folderName = uuidv4();
    try {
      const structuredCode = this.wrapCppCode(code);

      await mkdir(folderName);

      const fileName = `${uuidv4()}.cpp`;

      const filePath = join(folderName, fileName);
      await writeFile(filePath, structuredCode);

      const execFileName = 'a.exe';

      const compileResult = await this.compileCode('g++', 'utf-8', [
        filePath,
        '-o',
        join(folderName, 'a.exe'),
      ]);

      if (compileResult.stderr) {
        return compileResult.stderr;
      }

      const executionResult = await this.executeProgram(
        folderName,
        execFileName,
        'utf-8',
      );

      return executionResult;
    } catch (error) {
      const errorMessage = error.stdout
        ? error.stdout.toString('utf-8')
        : error.stderr
          ? error.stderr.toString('utf-8')
          : error.message
            ? error.message
            : 'Unknown error occurred';
      return errorMessage;
    } finally {
      await rm(folderName, { recursive: true });
    }
  }

  private async executeCS(code: string, input: string[]): Promise<string> {
    const folderName = uuidv4();
    try {
      const structuredCode = this.wrapCSharpCode(code);

      await mkdir(folderName);

      const fileName = `${uuidv4()}.cs`;

      const filePath = join(folderName, fileName);
      await writeFile(filePath, structuredCode);

      const execFileName = `${fileName.substring(0, fileName.length - 3)}.exe`;

      const compileResult = await this.compileCode('csc', 'CP866', [filePath]);

      await rename(execFileName, join(folderName, execFileName));

      if (compileResult.stderr) {
        return compileResult.stderr;
      }

      const executionResult = await this.executeProgramWithInput(
        folderName,
        execFileName,
        input,
        'CP866',
      );

      return executionResult;
    } catch (error) {
      const errorMessage = error.stdout
        ? this.removeHeader(error.stdout.toString('utf-8'))
        : error.stderr
          ? this.removeHeader(error.stderr.toString('utf-8'))
          : error.message
            ? error.message
            : 'Unknown error occurred';
      return errorMessage;
    } finally {
      await rm(folderName, { recursive: true });
    }
  }
  private async executeProgramWithInput(
    folderName: string,
    execFileName: string,
    input: string[] = [],
    encoding: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const childProcess = spawn(`./${folderName}/${execFileName}`, [], {
        stdio: ['pipe', 'pipe'],
      });

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += iconv.decode(Buffer.from(data), encoding);
      });

      childProcess.stderr.on('data', (data) => {
        error += iconv.decode(Buffer.from(data), encoding);
      });

      childProcess.stdin.write(input);

      childProcess.stdin.end();

      childProcess.on('error', (error) => {
        reject(error);
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

  private removeHeader(errorMsg: string): string {
    const headerIndex = errorMsg.indexOf('error');
    if (headerIndex !== -1) {
      return errorMsg.substring(headerIndex);
    }
    return errorMsg;
  }
  private wrapCSharpCode(code: string): string {
    if (
      !code.includes('namespace') &&
      !code.includes('class') &&
      !code.includes('Main')
    ) {
      return `using System;
      using System.Collections.Generic;
      using System.Linq;
      using System.Text;
      using System.Threading.Tasks;
      namespace MyCode
      {
        class Program 
        {
          static void Main(string[] args)
          {
            ${code}
          }
        }
      }`;
    }
    return code;
  }

  private wrapJavaCode(code: string): string {
    if (!code.includes('class') && !code.includes('Main')) {
      return `class Main 
      {
        public static void main(String[] args) {
          ${code}
        }
    }`;
    }
    return code;
  }

  private wrapCppCode(code: string): string {
    if (!code.includes('int main')) {
      return `#include <iostream>
      using namespace std;
      int main() {
        ${code}
        return 0;
      }`;
    }
    return code;
  }

  private compileCode(
    command: string,
    encoding: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        const childProcess = spawn(command, args);
        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data) => {
          stdout += iconv.decode(Buffer.from(data), encoding);
        });

        childProcess.stderr.on('data', (data) => {
          stderr += iconv.decode(Buffer.from(data), encoding);
        });

        childProcess.on('close', (exitCode) => {
          if (exitCode === 0) {
            resolve({ stdout, stderr });
          } else {
            reject({ stdout, stderr });
          }
        });

        childProcess.on('error', (error) => {
          reject({ stdout: '', stderr: error.toString() });
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
        output += iconv.decode(Buffer.from(data), 'Windows-1251');
      });

      childProcess.stderr.on('data', (data) => {
        error += iconv.decode(Buffer.from(data), 'Windows-1251');
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
  private executeProgram(
    folderName: string,
    execFileName: string,
    encoding: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const childProcess = spawn(`./${folderName}/${execFileName}`);

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += iconv.decode(Buffer.from(data), encoding);
      });

      childProcess.stderr.on('data', (data) => {
        error += iconv.decode(Buffer.from(data), encoding);
      });

      childProcess.on('error', (error) => {
        reject(error);
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
