import { window } from "vscode";

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

export interface Logger {
  d(message: string, ...params: any[]): number;
  e(message: string, ...params: any[]): number;
  i(message: string, ...params: any[]): number;
}

let logger: Logger | undefined;

export function getLogger(): Logger {
  if (!logger) {
    logger = new ConsoleLogger();
  }
  return logger;
}

export class ConsoleLogger implements Logger {
  private outputChannel = window.createOutputChannel('Sfn-Preview');
  
  public d(message: string, ...params: any[]): number {
    console.trace(message, params);
    this.logMessage('DEBUG', message, params);
    return 0;
  }

  public e(message: string, ...params: any[]): number {
    console.error(message, params);
    this.logMessage('ERROR', message, params);
    return 0;
  }

  public i(message: string, ...params: any[]): number {
    console.info(message, params);
    this.logMessage('INFO', message, params);    
    return 0;
  }

  private logMessage(logLevel: LogLevel, message: string, ...params: any[]) {
    this.outputChannel.appendLine(`[${logLevel}] - ${message}`);
    params.forEach((p) => {
      if (p.length !== 0) {
        this.outputChannel.appendLine(`   ${JSON.stringify(p)}`);
      }
    });
  }
}
