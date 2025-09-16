/**
 * Cache Manager for Kwisatz-Haderach
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import { Logger } from '@/utils/logging.js';

export class CacheManager {
  private static instance: CacheManager;
  private readonly logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async initialize(context: ExtensionContext): Promise<void> {
    this.logger.info('💾 Initializing cache manager...');
  }
}
