/**
 * Settings Panel Provider for VSCode
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import { Logger } from '@/utils/logging.js';

export class SettingsPanelProvider {
  private readonly logger: Logger;

  constructor(private context: ExtensionContext) {
    this.logger = Logger.getInstance();
  }
}
