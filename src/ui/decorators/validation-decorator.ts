/**
 * Validation Decorator for VSCode
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import type { ValidationService } from '@/services/validation-service.js';
import { Logger } from '@/utils/logging.js';

export class ValidationDecorator {
  private readonly logger: Logger;
  private errorDecorationType: vscode.TextEditorDecorationType;
  private warningDecorationType: vscode.TextEditorDecorationType;
  private successDecorationType: vscode.TextEditorDecorationType;

  constructor(
    private context: ExtensionContext,
    private validationService: ValidationService
  ) {
    this.logger = Logger.getInstance();
    
    // Create decoration types for different validation states
    this.errorDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      border: '1px solid rgba(255, 0, 0, 0.3)',
      borderRadius: '2px'
    });
    
    this.warningDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 165, 0, 0.1)',
      border: '1px solid rgba(255, 165, 0, 0.3)',
      borderRadius: '2px'
    });
    
    this.successDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(0, 255, 0, 0.1)',
      border: '1px solid rgba(0, 255, 0, 0.3)',
      borderRadius: '2px'
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('✅ Initializing validation decorator...');
  }

  async updateDecorations(document: vscode.TextDocument): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) {
      return;
    }

    // Mock validation decorations for testing
    const errorDecorations: vscode.DecorationOptions[] = [];
    const warningDecorations: vscode.DecorationOptions[] = [];
    const successDecorations: vscode.DecorationOptions[] = [];
    
    const text = document.getText();
    const citationPattern = /\([^)]*\d{4}[^)]*\)/g;
    let match;
    
    while ((match = citationPattern.exec(text)) !== null) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(start, end);
      
      // Mock validation: randomly assign validation status
      const random = Math.random();
      if (random < 0.1) {
        errorDecorations.push({
          range,
          hoverMessage: `❌ Citation validation failed: ${match[0]}`
        });
      } else if (random < 0.3) {
        warningDecorations.push({
          range,
          hoverMessage: `⚠️ Citation warning: ${match[0]}`
        });
      } else {
        successDecorations.push({
          range,
          hoverMessage: `✅ Citation validated: ${match[0]}`
        });
      }
    }
    
    editor.setDecorations(this.errorDecorationType, errorDecorations);
    editor.setDecorations(this.warningDecorationType, warningDecorations);
    editor.setDecorations(this.successDecorationType, successDecorations);
  }
}