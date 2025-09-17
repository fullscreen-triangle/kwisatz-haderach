/**
 * Error Handling utility for the Kwisatz-Haderach Citation Intelligence Framework
 */

import * as vscode from 'vscode';
import { Logger } from './logging.js';

/**
 * Error categories
 */
export type ErrorCategory = 
  | 'initialization'
  | 'processing' 
  | 'validation'
  | 'network'
  | 'configuration'
  | 'user-input'
  | 'system';

/**
 * Error context information
 */
interface ErrorContext {
  operation?: string;
  document?: string;
  timestamp?: Date;
  userId?: string;
  extensionVersion?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Structured error information
 */
interface StructuredError {
  id: string;
  category: ErrorCategory;
  message: string;
  originalError?: Error;
  context?: ErrorContext;
  retryable: boolean;
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Error Handler implementation
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private readonly logger: Logger;
  private errorLog: StructuredError[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle activation error
   */
  public handleActivationError(error: unknown): void {
    const structuredError = this.createStructuredError(
      error,
      'initialization',
      'Extension activation failed',
      'Failed to activate Kwisatz-Haderach extension. Please check your configuration and try reloading the window.',
      { operation: 'extension-activation' }
    );

    this.logError(structuredError);
    this.showErrorToUser(structuredError);
  }

  /**
   * Handle processing error
   */
  public handleProcessingError(error: unknown, operation: string, document?: vscode.TextDocument): void {
    const structuredError = this.createStructuredError(
      error,
      'processing',
      `Processing failed during ${operation}`,
      `An error occurred while ${operation}. The operation has been cancelled.`,
      { 
        operation,
        document: document?.fileName
      }
    );

    this.logError(structuredError);
    this.showErrorToUser(structuredError);
  }

  /**
   * Handle validation error
   */
  public handleValidationError(error: unknown, context?: ErrorContext): void {
    const structuredError = this.createStructuredError(
      error,
      'validation',
      'Validation error occurred',
      'Citation validation encountered an error. Some validations may be incomplete.',
      context
    );

    this.logError(structuredError);
    this.showErrorToUser(structuredError);
  }

  /**
   * Handle network error
   */
  public handleNetworkError(error: unknown, operation: string): void {
    const structuredError = this.createStructuredError(
      error,
      'network',
      `Network error during ${operation}`,
      'Network connection failed. Please check your internet connection and API keys.',
      { operation }
    );

    structuredError.retryable = true;

    this.logError(structuredError);
    this.showErrorToUser(structuredError);
  }

  /**
   * Handle configuration error
   */
  public handleConfigurationError(error: unknown, setting: string): void {
    const structuredError = this.createStructuredError(
      error,
      'configuration',
      `Configuration error for ${setting}`,
      `Configuration setting '${setting}' is invalid. Please check your settings and update the configuration.`,
      { setting }
    );

    this.logError(structuredError);
    this.showErrorToUser(structuredError);
  }

  /**
   * Handle user input error
   */
  public handleUserInputError(error: unknown, input: string): void {
    const structuredError = this.createStructuredError(
      error,
      'user-input',
      'Invalid user input',
      'The provided input is invalid. Please check the format and try again.',
      { input }
    );

    this.logError(structuredError);
    this.showErrorToUser(structuredError);
  }

  /**
   * Handle system error
   */
  public handleSystemError(error: unknown, context?: ErrorContext): void {
    const structuredError = this.createStructuredError(
      error,
      'system',
      'System error occurred',
      'A system error occurred. Please try again or restart VSCode if the problem persists.',
      context
    );

    this.logError(structuredError);
    this.showErrorToUser(structuredError);
  }

  /**
   * Get error history
   */
  public getErrorHistory(): StructuredError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorLog = [];
  }

  /**
   * Check if error is retryable
   */
  public isRetryable(error: StructuredError): boolean {
    return error.retryable;
  }

  // ========== Private Methods ==========

  /**
   * Create structured error from raw error
   */
  private createStructuredError(
    error: unknown,
    category: ErrorCategory,
    message: string,
    userMessage: string,
    context?: ErrorContext
  ): StructuredError {
    const originalError = error instanceof Error ? error : undefined;
    
    return {
      id: `error_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
      category,
      message,
      originalError,
      context: {
        timestamp: new Date(),
        extensionVersion: '1.0.0',
        ...context
      },
      retryable: this.determineIfRetryable(category, error),
      userMessage,
      technicalDetails: originalError?.stack || String(error)
    };
  }

  /**
   * Determine if error is retryable
   */
  private determineIfRetryable(category: ErrorCategory, error: unknown): boolean {
    switch (category) {
      case 'network':
        return true;
      case 'processing':
        return this.isTransientError(error);
      case 'configuration':
        return false;
      case 'user-input':
        return false;
      case 'initialization':
        return true;
      case 'validation':
        return true;
      case 'system':
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if error is transient
   */
  private isTransientError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') ||
             message.includes('rate limit') ||
             message.includes('temporary') ||
             message.includes('service unavailable') ||
             message.includes('connection') ||
             message.includes('network');
    }
    return false;
  }

  /**
   * Log error with context
   */
  private logError(error: StructuredError): void {
    this.errorLog.push(error);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Log to VSCode output
    this.logger.error(
      `[${error.category.toUpperCase()}] ${error.message}`,
      error.originalError,
      {
        errorId: error.id,
        retryable: error.retryable,
        context: error.context
      }
    );
  }

  /**
   * Show error to user with appropriate actions
   */
  private async showErrorToUser(error: StructuredError): Promise<void> {
    const actions: string[] = [];
    
    if (error.retryable) {
      actions.push('Retry');
    }
    
    if (error.category === 'configuration') {
      actions.push('Open Settings');
    }
    
    actions.push('Show Details', 'Dismiss');

    const choice = await vscode.window.showErrorMessage(
      error.userMessage,
      ...actions
    );

    await this.handleUserChoice(choice, error);
  }

  /**
   * Handle user's choice from error dialog
   */
  private async handleUserChoice(choice: string | undefined, error: StructuredError): Promise<void> {
    switch (choice) {
      case 'Retry':
        // Implementation would depend on the specific error context
        void vscode.window.showInformationMessage('Retry functionality not implemented yet');
        break;
        
      case 'Open Settings':
        await vscode.commands.executeCommand('workbench.action.openSettings', 'kwisatz-haderach');
        break;
        
      case 'Show Details':
        await this.showErrorDetails(error);
        break;
        
      case 'Dismiss':
      default:
        // Do nothing
        break;
    }
  }

  /**
   * Show detailed error information
   */
  private async showErrorDetails(error: StructuredError): Promise<void> {
    const details = [
      `Error ID: ${error.id}`,
      `Category: ${error.category}`,
      `Message: ${error.message}`,
      `Retryable: ${error.retryable ? 'Yes' : 'No'}`,
      `Timestamp: ${error.context?.timestamp?.toISOString()}`,
      ''
    ];

    if (error.context?.operation) {
      details.push(`Operation: ${error.context.operation}`);
    }

    if (error.context?.document) {
      details.push(`Document: ${error.context.document}`);
    }

    if (error.technicalDetails) {
      details.push('', 'Technical Details:', error.technicalDetails);
    }

    const document = await vscode.workspace.openTextDocument({
      content: details.join('\n'),
      language: 'plaintext'
    });

    await vscode.window.showTextDocument(document);
  }
}
