/**
 * Quality Decorator for VSCode - shows citation quality indicators
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import type { RecommendationEngine } from '@/services/recommendation-engine.js';
import { Logger } from '@/utils/logging.js';

export class QualityDecorator {
  private readonly logger: Logger;
  private highQualityDecorationType: vscode.TextEditorDecorationType;
  private mediumQualityDecorationType: vscode.TextEditorDecorationType;
  private lowQualityDecorationType: vscode.TextEditorDecorationType;

  constructor(
    private context: ExtensionContext,
    private recommendationEngine: RecommendationEngine
  ) {
    this.logger = Logger.getInstance();
    
    // Create decoration types for different quality levels
    this.highQualityDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: ' 🌟',
        color: 'green'
      }
    });
    
    this.mediumQualityDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: ' ⭐',
        color: 'orange'
      }
    });
    
    this.lowQualityDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: ' ⚠️',
        color: 'red'
      }
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('⭐ Initializing quality decorator...');
  }

  async updateDecorations(document: vscode.TextDocument): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) {
      return;
    }

    // Mock quality indicators for testing
    const highQualityDecorations: vscode.DecorationOptions[] = [];
    const mediumQualityDecorations: vscode.DecorationOptions[] = [];
    const lowQualityDecorations: vscode.DecorationOptions[] = [];
    
    const text = document.getText();
    const citationPattern = /\([^)]*\d{4}[^)]*\)/g;
    let match;
    
    while ((match = citationPattern.exec(text)) !== null) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(start, end);
      
      // Mock quality assessment: randomly assign quality levels
      const quality = Math.random();
      if (quality > 0.8) {
        highQualityDecorations.push({
          range,
          hoverMessage: `High quality citation (${Math.round(quality * 100)}%): ${match[0]}`
        });
      } else if (quality > 0.6) {
        mediumQualityDecorations.push({
          range,
          hoverMessage: `Medium quality citation (${Math.round(quality * 100)}%): ${match[0]}`
        });
      } else {
        lowQualityDecorations.push({
          range,
          hoverMessage: `Low quality citation (${Math.round(quality * 100)}%): ${match[0]}`
        });
      }
    }
    
    editor.setDecorations(this.highQualityDecorationType, highQualityDecorations);
    editor.setDecorations(this.mediumQualityDecorationType, mediumQualityDecorations);
    editor.setDecorations(this.lowQualityDecorationType, lowQualityDecorations);
  }
}
