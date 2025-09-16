/**
 * Validation Panel Provider for VSCode
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import type { ValidationService } from '@/services/validation-service.js';
import { Logger } from '@/utils/logging.js';

export class ValidationPanelProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private readonly logger: Logger;
  private validations: vscode.TreeItem[] = [];

  constructor(
    private context: ExtensionContext,
    private validationService: ValidationService
  ) {
    this.logger = Logger.getInstance();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!element) {
      return Promise.resolve(this.validations);
    }
    return Promise.resolve([]);
  }

  async updateForDocument(document: vscode.TextDocument): Promise<void> {
    try {
      const result = await this.validationService.validateDocument(document);
      
      this.validations = [
        new vscode.TreeItem(`Overall Score: ${result.overallScore}%`, vscode.TreeItemCollapsibleState.None),
        new vscode.TreeItem(`Citations Validated: ${result.citationValidations.length}`, vscode.TreeItemCollapsibleState.None)
      ];
      
      this.refresh();
    } catch (error) {
      this.logger.error('Failed to update validation panel:', error);
    }
  }
}
