/**
 * Domain LLM Storage for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * Manages storage and retrieval of domain-specific mini-LLMs created by the Purpose Framework.
 */

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import type { AcademicDomain } from '@/types/citations.js';
import { Logger } from '@/utils/logging.js';

/**
 * Domain model metadata
 */
interface DomainModelMetadata {
  /** Model ID */
  modelId: string;
  
  /** Model name */
  name: string;
  
  /** Academic domain */
  domain: AcademicDomain;
  
  /** Source paper information */
  sourcePaper: {
    title: string;
    authors: string[];
    filePath: string;
    processedAt: Date;
  };
  
  /** Training information */
  training: {
    trainingTime: number;
    accuracy: number;
    qualityScore: number;
    qaGeneratedCount: number;
    citationFocusWeight: number;
  };
  
  /** Model capabilities */
  capabilities: string[];
  
  /** Model size information */
  size: {
    parameters: number;
    fileSizeMB: number;
    memoryRequiredMB: number;
  };
  
  /** Timestamps */
  createdAt: Date;
  lastUsed?: Date;
  lastUpdated?: Date;
  
  /** Version information */
  version: string;
  
  /** Storage location */
  storageLocation: string;
}

/**
 * Model artifacts for storage
 */
interface ModelArtifacts {
  /** Model files */
  modelFiles: {
    modelPath: string;
    weightsPath: string;
    configPath: string;
  };
  
  /** Tokenizer files */
  tokenizer: string;
  
  /** Configuration file */
  configuration: string;
  
  /** Metadata file */
  metadata: string;
  
  /** Documentation */
  documentation: string;
}

/**
 * Storage statistics
 */
interface StorageStatistics {
  /** Total models stored */
  totalModels: number;
  
  /** Models by domain */
  modelsByDomain: Record<AcademicDomain, number>;
  
  /** Total storage used (MB) */
  totalStorageMB: number;
  
  /** Most used models */
  mostUsedModels: Array<{
    modelId: string;
    usageCount: number;
    lastUsed: Date;
  }>;
  
  /** Storage health */
  storageHealth: 'healthy' | 'warning' | 'critical';
}

/**
 * Domain LLM Storage implementation
 */
export class DomainLLMStorage {
  private static instance: DomainLLMStorage;
  private readonly logger: Logger;
  private context: ExtensionContext | null = null;
  private domainModels: Map<string, DomainModelMetadata> = new Map();
  private domainIndex: Map<AcademicDomain, string[]> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DomainLLMStorage {
    if (!DomainLLMStorage.instance) {
      DomainLLMStorage.instance = new DomainLLMStorage();
    }
    return DomainLLMStorage.instance;
  }

  /**
   * Initialize storage
   */
  public async initialize(context: ExtensionContext): Promise<void> {
    this.context = context;
    this.logger.info('🏋️ Initializing Domain LLM Storage...');
    
    try {
      // Load existing models from storage
      await this.loadModelsFromStorage();
      
      // Initialize domain indexes
      this.buildDomainIndexes();
      
      this.logger.info(`✅ Domain LLM Storage initialized with ${this.domainModels.size} models`);
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize Domain LLM Storage:', error);
      throw error;
    }
  }

  /**
   * Store a domain-specific model
   */
  public async storeDomainModel(
    domain: AcademicDomain,
    modelInfo: {
      modelId: string;
      name: string;
      baseModel: string;
      accuracy: number;
      capabilities: string[];
      size: { parameters: number; fileSize: number; memoryRequirements: number };
      version: string;
      storageLocation: string;
    },
    artifacts: ModelArtifacts
  ): Promise<void> {
    this.logger.info(`💾 Storing domain model for ${domain}: ${modelInfo.modelId}`);
    
    try {
      const metadata: DomainModelMetadata = {
        modelId: modelInfo.modelId,
        name: modelInfo.name,
        domain,
        sourcePaper: {
          title: 'Unknown Paper',
          authors: [],
          filePath: '',
          processedAt: new Date()
        },
        training: {
          trainingTime: 0,
          accuracy: modelInfo.accuracy,
          qualityScore: modelInfo.accuracy * 100,
          qaGeneratedCount: 0,
          citationFocusWeight: 0.8
        },
        capabilities: modelInfo.capabilities,
        size: {
          parameters: modelInfo.size.parameters,
          fileSizeMB: modelInfo.size.fileSize,
          memoryRequiredMB: modelInfo.size.memoryRequirements
        },
        createdAt: new Date(),
        version: modelInfo.version,
        storageLocation: modelInfo.storageLocation
      };

      // Store in memory
      this.domainModels.set(modelInfo.modelId, metadata);
      
      // Update domain index
      if (!this.domainIndex.has(domain)) {
        this.domainIndex.set(domain, []);
      }
      this.domainIndex.get(domain)!.push(modelInfo.modelId);
      
      // Persist to storage
      await this.persistModelMetadata(metadata);
      await this.persistModelArtifacts(modelInfo.modelId, artifacts);
      
      this.logger.info(`✅ Domain model stored successfully: ${modelInfo.modelId}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to store domain model ${modelInfo.modelId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve domain models for a specific domain
   */
  public async getDomainModels(domain: AcademicDomain): Promise<DomainModelMetadata[]> {
    const modelIds = this.domainIndex.get(domain) || [];
    return modelIds.map(id => this.domainModels.get(id)!).filter(Boolean);
  }

  /**
   * Get specific domain model
   */
  public async getDomainModel(modelId: string): Promise<DomainModelMetadata | undefined> {
    return this.domainModels.get(modelId);
  }

  /**
   * Load domain model for inference
   */
  public async loadDomainModel(modelId: string): Promise<LoadedDomainModel | null> {
    const metadata = this.domainModels.get(modelId);
    if (!metadata) {
      this.logger.warn(`Domain model not found: ${modelId}`);
      return null;
    }

    try {
      this.logger.info(`📥 Loading domain model: ${modelId}`);
      
      // Update last used timestamp
      metadata.lastUsed = new Date();
      await this.persistModelMetadata(metadata);
      
      // Mock loading - in real implementation, this would load the actual model
      const loadedModel: LoadedDomainModel = {
        modelId: metadata.modelId,
        metadata,
        model: null, // Would contain actual model instance
        tokenizer: null, // Would contain actual tokenizer
        isLoaded: true,
        loadedAt: new Date()
      };
      
      this.logger.info(`✅ Domain model loaded: ${modelId}`);
      return loadedModel;
      
    } catch (error) {
      this.logger.error(`❌ Failed to load domain model ${modelId}:`, error);
      return null;
    }
  }

  /**
   * Delete domain model
   */
  public async deleteDomainModel(modelId: string): Promise<boolean> {
    const metadata = this.domainModels.get(modelId);
    if (!metadata) {
      this.logger.warn(`Domain model not found for deletion: ${modelId}`);
      return false;
    }

    try {
      this.logger.info(`🗑️ Deleting domain model: ${modelId}`);
      
      // Remove from memory
      this.domainModels.delete(modelId);
      
      // Remove from domain index
      const domainModels = this.domainIndex.get(metadata.domain);
      if (domainModels) {
        const index = domainModels.indexOf(modelId);
        if (index !== -1) {
          domainModels.splice(index, 1);
        }
      }
      
      // Remove from storage
      await this.removeModelFromStorage(modelId);
      
      this.logger.info(`✅ Domain model deleted: ${modelId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`❌ Failed to delete domain model ${modelId}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStatistics(): Promise<StorageStatistics> {
    const totalModels = this.domainModels.size;
    const modelsByDomain: Record<AcademicDomain, number> = {} as Record<AcademicDomain, number>;
    
    // Initialize all domains to 0
    const allDomains: AcademicDomain[] = [
      'medical', 'legal', 'computer-science', 'social-sciences', 'natural-sciences',
      'humanities', 'engineering', 'mathematics', 'physics', 'chemistry',
      'biology', 'psychology', 'history', 'philosophy', 'linguistics',
      'economics', 'interdisciplinary'
    ];
    
    allDomains.forEach(domain => {
      modelsByDomain[domain] = 0;
    });
    
    let totalStorageMB = 0;
    const mostUsedModels: Array<{ modelId: string; usageCount: number; lastUsed: Date }> = [];
    
    for (const [modelId, metadata] of this.domainModels) {
      modelsByDomain[metadata.domain]++;
      totalStorageMB += metadata.size.fileSizeMB;
      
      // Mock usage count
      const usageCount = Math.floor(Math.random() * 100);
      mostUsedModels.push({
        modelId,
        usageCount,
        lastUsed: metadata.lastUsed || metadata.createdAt
      });
    }
    
    // Sort most used models
    mostUsedModels.sort((a, b) => b.usageCount - a.usageCount);
    
    // Determine storage health
    let storageHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (totalStorageMB > 10000) { // 10GB
      storageHealth = 'critical';
    } else if (totalStorageMB > 5000) { // 5GB
      storageHealth = 'warning';
    }
    
    return {
      totalModels,
      modelsByDomain,
      totalStorageMB,
      mostUsedModels: mostUsedModels.slice(0, 10),
      storageHealth
    };
  }

  /**
   * Cleanup old or unused models
   */
  public async performCleanup(options: {
    maxAge?: number; // Days
    maxUnused?: number; // Days since last use
    maxStorageMB?: number; // Maximum storage allowed
  } = {}): Promise<void> {
    this.logger.info('🧹 Performing domain model storage cleanup...');
    
    const {
      maxAge = 90, // 90 days
      maxUnused = 30, // 30 days
      maxStorageMB = 5000 // 5GB
    } = options;
    
    const now = new Date();
    const modelsToDelete: string[] = [];
    
    for (const [modelId, metadata] of this.domainModels) {
      // Check age
      const ageInDays = (now.getTime() - metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > maxAge) {
        modelsToDelete.push(modelId);
        continue;
      }
      
      // Check last usage
      const lastUsed = metadata.lastUsed || metadata.createdAt;
      const daysSinceUsed = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUsed > maxUnused) {
        modelsToDelete.push(modelId);
        continue;
      }
    }
    
    // Check storage size
    const stats = await this.getStorageStatistics();
    if (stats.totalStorageMB > maxStorageMB) {
      // Delete least recently used models
      const modelsByUsage = Array.from(this.domainModels.entries())
        .sort(([, a], [, b]) => {
          const aLastUsed = a.lastUsed || a.createdAt;
          const bLastUsed = b.lastUsed || b.createdAt;
          return aLastUsed.getTime() - bLastUsed.getTime();
        });
      
      let currentStorage = stats.totalStorageMB;
      for (const [modelId, metadata] of modelsByUsage) {
        if (currentStorage <= maxStorageMB) break;
        if (!modelsToDelete.includes(modelId)) {
          modelsToDelete.push(modelId);
          currentStorage -= metadata.size.fileSizeMB;
        }
      }
    }
    
    // Delete models
    for (const modelId of modelsToDelete) {
      await this.deleteDomainModel(modelId);
    }
    
    this.logger.info(`🧹 Cleanup complete: deleted ${modelsToDelete.length} models`);
  }

  // ========== Private Methods ==========

  /**
   * Load models from persistent storage
   */
  private async loadModelsFromStorage(): Promise<void> {
    if (!this.context) {
      return;
    }

    // Mock loading - in real implementation, this would read from files
    // For now, we'll just initialize empty storage
    this.domainModels.clear();
    this.domainIndex.clear();
  }

  /**
   * Build domain indexes
   */
  private buildDomainIndexes(): void {
    this.domainIndex.clear();
    
    for (const [modelId, metadata] of this.domainModels) {
      if (!this.domainIndex.has(metadata.domain)) {
        this.domainIndex.set(metadata.domain, []);
      }
      this.domainIndex.get(metadata.domain)!.push(modelId);
    }
  }

  /**
   * Persist model metadata
   */
  private async persistModelMetadata(metadata: DomainModelMetadata): Promise<void> {
    if (!this.context) {
      return;
    }

    // Mock persistence - in real implementation, this would save to file system
    this.logger.debug(`Persisting metadata for model: ${metadata.modelId}`);
  }

  /**
   * Persist model artifacts
   */
  private async persistModelArtifacts(modelId: string, artifacts: ModelArtifacts): Promise<void> {
    if (!this.context) {
      return;
    }

    // Mock persistence - in real implementation, this would save files
    this.logger.debug(`Persisting artifacts for model: ${modelId}`);
  }

  /**
   * Remove model from storage
   */
  private async removeModelFromStorage(modelId: string): Promise<void> {
    if (!this.context) {
      return;
    }

    // Mock removal - in real implementation, this would delete files
    this.logger.debug(`Removing storage for model: ${modelId}`);
  }
}

// ========== Supporting Types ==========

/**
 * Loaded domain model
 */
interface LoadedDomainModel {
  /** Model ID */
  modelId: string;
  
  /** Model metadata */
  metadata: DomainModelMetadata;
  
  /** Loaded model instance */
  model: any; // Would be actual model type
  
  /** Loaded tokenizer */
  tokenizer: any; // Would be actual tokenizer type
  
  /** Is model loaded */
  isLoaded: boolean;
  
  /** When model was loaded */
  loadedAt: Date;
}
