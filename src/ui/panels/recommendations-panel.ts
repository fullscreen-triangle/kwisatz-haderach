/**
 * Recommendations Panel Provider for VSCode
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import type { RecommendationEngine } from '@/services/recommendation-engine.js';
import { Logger } from '@/utils/logging.js';

export class RecommendationsPanelProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private readonly logger: Logger;
  private recommendations: vscode.TreeItem[] = [];

  constructor(
    private context: ExtensionContext,
    private recommendationEngine: RecommendationEngine
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
      return Promise.resolve(this.recommendations);
    }
    return Promise.resolve([]);
  }

  async updateForDocument(document: vscode.TextDocument): Promise<void> {
    this.recommendations = [
      new vscode.TreeItem('Loading recommendations...', vscode.TreeItemCollapsibleState.None)
    ];
    this.refresh();
  }
}
