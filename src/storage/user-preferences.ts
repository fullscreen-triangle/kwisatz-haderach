/**
 * User Preferences Storage
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import { Logger } from '@/utils/logging.js';

export class UserPreferences {
  private static instance: UserPreferences;
  private readonly logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): UserPreferences {
    if (!UserPreferences.instance) {
      UserPreferences.instance = new UserPreferences();
    }
    return UserPreferences.instance;
  }

  async initialize(context: ExtensionContext): Promise<void> {
    this.logger.info('👤 Initializing user preferences...');
  }

  async save(): Promise<void> {
    this.logger.info('💾 Saving user preferences...');
  }
}
