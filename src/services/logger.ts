import { toast } from 'react-hot-toast';

interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  context: string;
  message: string;
  requestId?: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private debugMode: boolean = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  enableDebug(): void {
    this.debugMode = true;
    this.debug('Logger', 'Debug mode enabled');
  }

  disableDebug(): void {
    this.debug('Logger', 'Debug mode disabled');
    this.debugMode = false;
  }

  private addEntry(
    level: LogEntry['level'],
    context: string,
    message: string,
    requestId?: string,
    data?: any
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context,
      message,
      requestId,
      data
    };

    this.logs.push(entry);

    if (this.debugMode) {
      const requestIdStr = requestId ? ` [${requestId}]` : '';
      console.log(
        `[${level.toUpperCase()}]${requestIdStr} ${context}: ${message}`,
        data || ''
      );
    }
  }

  debug(context: string, message: string, data?: any): void {
    if (this.debugMode) {
      this.addEntry('debug', context, message, data?.requestId, data);
    }
  }

  info(context: string, message: string, data?: any): void {
    this.addEntry('info', context, message, data?.requestId, data);
  }

  warn(context: string, message: string, data?: any): void {
    this.addEntry('warn', context, message, data?.requestId, data);
    if (this.debugMode) {
      toast.error(`Warning: ${message}`);
    }
  }

  error(context: string, message: string, data?: any): void {
    this.addEntry('error', context, message, data?.requestId, data);
    const requestIdStr = data?.requestId ? ` (Request ID: ${data.requestId})` : '';
    toast.error(`${message}${requestIdStr}`);
  }

  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getErrorReport(): string {
    const errors = this.logs.filter(log => log.level === 'error');
    if (errors.length === 0) return 'No errors found.';

    return errors.map(error => {
      const date = new Date(error.timestamp).toISOString();
      const requestIdStr = error.requestId ? ` [${error.requestId}]` : '';
      return `[${date}]${requestIdStr} ${error.context}: ${error.message}\n${
        error.data ? JSON.stringify(error.data, null, 2) : ''
      }`;
    }).join('\n\n');
  }
}

export const logger = Logger.getInstance();