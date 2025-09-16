/**
 * Default Settings for Kwisatz-Haderach
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import { Logger } from '@/utils/logging.js';

export class DefaultSettings {
  private static instance: DefaultSettings;
  private readonly logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): DefaultSettings {
    if (!DefaultSettings.instance) {
      DefaultSettings.instance = new DefaultSettings();
    }
    return DefaultSettings.instance;
  }

  async initialize(context: ExtensionContext): Promise<void> {
    this.logger.info('⚙️ Initializing default settings...');
  }
}
