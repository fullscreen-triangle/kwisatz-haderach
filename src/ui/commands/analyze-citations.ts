/**
 * Analyze Citations Command
 */

import * as vscode from 'vscode';
import type { WorkflowOrchestrator } from '@/services/workflow-orchestrator.js';
import { Logger } from '@/utils/logging.js';

export class AnalyzeCitationsCommand {
  private readonly logger: Logger;

  constructor(private workflowOrchestrator: WorkflowOrchestrator) {
    this.logger = Logger.getInstance();
  }

  async execute(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    
    if (!activeEditor) {
      void vscode.window.showWarningMessage('No active document to analyze');
      return;
    }

    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing Citations...',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 20, message: 'Processing document...' });
        
        const result = await this.workflowOrchestrator.processDocument(activeEditor.document);
        
        progress.report({ increment: 80, message: 'Analysis complete!' });
        
        void vscode.window.showInformationMessage(
          `🎯 Analysis complete! Found ${result.analysis.citations.length} citations with ${result.metadata.qualityScore.toFixed(1)}% average quality.`
        );
      });
    } catch (error) {
      this.logger.error('Citation analysis failed:', error);
      void vscode.window.showErrorMessage(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
