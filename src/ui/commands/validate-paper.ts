/**
 * Validate Paper Command
 */

import * as vscode from 'vscode';
import type { ValidationService } from '@/services/validation-service.js';
import { Logger } from '@/utils/logging.js';

export class ValidatePaperCommand {
  private readonly logger: Logger;

  constructor(private validationService: ValidationService) {
    this.logger = Logger.getInstance();
  }

  async execute(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    
    if (!activeEditor) {
      void vscode.window.showWarningMessage('No active document to validate');
      return;
    }

    try {
      const result = await this.validationService.validateDocument(activeEditor.document);
      
      void vscode.window.showInformationMessage(
        `✅ Validation complete! Overall score: ${result.overallScore}%`
      );
    } catch (error) {
      this.logger.error('Paper validation failed:', error);
      void vscode.window.showErrorMessage(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
