/**
 * Logging utility for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * Provides structured logging with different levels and output channels.
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: unknown;
  source?: string;
  context?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  outputToConsole: boolean;
  outputToFile: boolean;
  outputToChannel: boolean;
  maxLogSize: number;
  enablePerformanceLogging: boolean;
}

/**
 * Logger implementation
 */
export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel | null = null;
  private logEntries: LogEntry[] = [];
  private config: LoggerConfig;
  private context: ExtensionContext | null = null;

  private constructor() {
    // Default configuration
    this.config = {
      level: 'info',
      outputToConsole: true,
      outputToFile: false,
      outputToChannel: true,
      maxLogSize: 1000,
      enablePerformanceLogging: false
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize logger with extension context
   */
  public initialize(context: ExtensionContext): void {
    this.context = context;
    
    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel('Kwisatz-Haderach Citation Intelligence');
    context.subscriptions.push(this.outputChannel);

    // Load configuration
    this.loadConfiguration();

    // Set up configuration change listener
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('kwisatz-haderach.logging')) {
        this.loadConfiguration();
      }
    });
    context.subscriptions.push(configChangeListener);

    this.info('🚀 Logger initialized');
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log('debug', message, data, context);
  }

  /**
   * Log info message
   */
  public info(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log('info', message, data, context);
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log('warn', message, data, context);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log('error', message, error, context);
  }

  /**
   * Log performance metrics
   */
  public performance(operation: string, duration: number, details?: Record<string, unknown>): void {
    if (this.config.enablePerformanceLogging) {
      this.info(`⚡ ${operation} completed in ${duration.toFixed(2)}ms`, details);
    }
  }

  /**
   * Get recent log entries
   */
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Clear log entries
   */
  public clearLogs(): void {
    this.logEntries = [];
    if (this.outputChannel) {
      this.outputChannel.clear();
    }
    this.info('📋 Logs cleared');
  }

  /**
   * Show output channel
   */
  public showOutputChannel(): void {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }

  // ========== Private Methods ==========

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: unknown, context?: Record<string, unknown>): void {
    // Check if log level is enabled
    if (!this.isLevelEnabled(level)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      context
    };

    // Add to log entries
    this.logEntries.push(entry);

    // Maintain max log size
    if (this.logEntries.length > this.config.maxLogSize) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogSize);
    }

    // Output to various channels
    this.outputLog(entry);
  }

  /**
   * Check if log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.config.level];
  }

  /**
   * Output log entry to configured channels
   */
  private outputLog(entry: LogEntry): void {
    const formattedMessage = this.formatLogEntry(entry);

    // Console output
    if (this.config.outputToConsole) {
      this.outputToConsole(entry.level, formattedMessage);
    }

    // Output channel
    if (this.config.outputToChannel && this.outputChannel) {
      this.outputChannel.appendLine(formattedMessage);
    }

    // File output (would be implemented for production)
    if (this.config.outputToFile) {
      this.outputToFile(formattedMessage);
    }
  }

  /**
   * Format log entry for display
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    
    let message = `[${timestamp}] ${level} ${entry.message}`;

    // Add data if present
    if (entry.data !== undefined) {
      if (entry.data instanceof Error) {
        message += `\n  Error: ${entry.data.message}`;
        if (entry.data.stack) {
          message += `\n  Stack: ${entry.data.stack}`;
        }
      } else if (typeof entry.data === 'object') {
        try {
          message += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
        } catch (error) {
          message += `\n  Data: [Unable to serialize: ${error}]`;
        }
      } else {
        message += `\n  Data: ${String(entry.data)}`;
      }
    }

    // Add context if present
    if (entry.context && Object.keys(entry.context).length > 0) {
      try {
        message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
      } catch (error) {
        message += `\n  Context: [Unable to serialize: ${error}]`;
      }
    }

    return message;
  }

  /**
   * Output to console
   */
  private outputToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        console.error(message);
        break;
    }
  }

  /**
   * Output to file (placeholder for production implementation)
   */
  private outputToFile(message: string): void {
    // In production, this would write to a log file
    // For now, we'll just store the intention to log to file
    if (this.context) {
      // Could use context.logUri or context.globalStorageUri to write files
    }
  }

  /**
   * Load configuration from VSCode settings
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('kwisatz-haderach.logging');
    
    this.config = {
      level: config.get('level', 'info') as LogLevel,
      outputToConsole: config.get('outputToConsole', true),
      outputToFile: config.get('outputToFile', false),
      outputToChannel: config.get('outputToChannel', true),
      maxLogSize: config.get('maxLogSize', 1000),
      enablePerformanceLogging: config.get('enablePerformanceLogging', false)
    };
  }
}
