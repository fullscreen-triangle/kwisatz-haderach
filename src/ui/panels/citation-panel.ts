/**
 * Citation Panel Provider for VSCode
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import type { CitationAnalyzer } from '@/services/citation-analyzer.js';
import { Logger } from '@/utils/logging.js';

export class CitationPanelProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private readonly logger: Logger;
  private citations: vscode.TreeItem[] = [];

  constructor(
    private context: ExtensionContext,
    private citationAnalyzer: CitationAnalyzer
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
      return Promise.resolve(this.citations);
    }
    return Promise.resolve([]);
  }

  async updateForDocument(document: vscode.TextDocument): Promise<void> {
    try {
      const result = await this.citationAnalyzer.analyzeCitations(document);
      
      this.citations = result.citations.map((citation, index) => {
        const item = new vscode.TreeItem(
          `Citation ${index + 1}`,
          vscode.TreeItemCollapsibleState.None
        );
        
        item.description = citation.content.rawText.substring(0, 50) + '...';
        item.tooltip = citation.content.rawText;
        item.contextValue = 'citation';
        
        return item;
      });
      
      this.refresh();
    } catch (error) {
      this.logger.error('Failed to update citation panel:', error);
    }
  }
}
