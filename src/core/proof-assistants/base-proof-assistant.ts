/**
 * Base Proof Assistant Interface
 * 
 * Abstract base class that all proof assistants must implement
 */

import type {
  ProofAssistantType,
  FormalStatement,
  ProofValidationResult,
  SingleProofResult,
  TranslationResult,
  ProofSearchResult,
  ValidationContext,
  ProofAssistantConfig,
  MathematicalCitation
} from '@/types/proof-assistants';
import { Logger } from '@/utils/logging';

/**
 * Connection status for proof assistant
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * Proof assistant capabilities
 */
export interface ProofAssistantCapabilities {
  /** Can validate existing proofs */
  canValidate: boolean;
  
  /** Can search for proofs automatically */
  canSearchProofs: boolean;
  
  /** Can translate from natural language */
  canTranslateNatural: boolean;
  
  /** Can cross-validate with other assistants */
  canCrossValidate: boolean;
  
  /** Supported mathematical domains */
  supportedDomains: string[];
  
  /** Maximum proof complexity it can handle */
  maxComplexity: number;
  
  /** Average validation time (ms) */
  averageValidationTime: number;
}

/**
 * Abstract base class for all proof assistants
 */
export abstract class BaseProofAssistant {
  protected readonly logger: Logger;
  protected connectionStatus: ConnectionStatus = 'disconnected';
  protected config: ProofAssistantConfig;

  constructor(config: ProofAssistantConfig) {
    this.logger = Logger.getInstance();
    this.config = config;
  }

  /**
   * Get proof assistant type
   */
  abstract getType(): ProofAssistantType;

  /**
   * Get capabilities of this proof assistant
   */
  abstract getCapabilities(): ProofAssistantCapabilities;

  /**
   * Initialize and connect to the proof assistant
   */
  abstract initialize(): Promise<boolean>;

  /**
   * Disconnect from the proof assistant
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if the proof assistant is ready
   */
  isReady(): boolean {
    return this.connectionStatus === 'connected';
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Translate natural language mathematical statement to formal language
   */
  abstract translateToFormal(
    naturalStatement: string,
    context?: ValidationContext
  ): Promise<TranslationResult>;

  /**
   * Validate a formal mathematical statement
   */
  abstract validateStatement(
    statement: FormalStatement,
    context?: ValidationContext
  ): Promise<SingleProofResult>;

  /**
   * Search for a proof of a given statement
   */
  abstract searchProof(
    statement: FormalStatement,
    context?: ValidationContext
  ): Promise<ProofSearchResult>;

  /**
   * Check consistency of multiple statements
   */
  abstract checkConsistency(
    statements: FormalStatement[],
    context?: ValidationContext
  ): Promise<{
    consistent: boolean;
    contradictions: string[];
    confidence: number;
  }>;

  /**
   * Validate mathematical citations using this proof assistant
   */
  async validateMathematicalCitation(
    citation: MathematicalCitation,
    context?: ValidationContext
  ): Promise<SingleProofResult> {
    this.logger.info(`Validating citation using ${this.getType()}`, {
      citationId: citation.id,
      assistant: this.getType()
    });

    const startTime = Date.now();
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // Check if assistant is ready
      if (!this.isReady()) {
        await this.initialize();
      }

      // Validate each formal statement in the citation
      let overallValid = true;
      let totalConfidence = 0;
      let statementCount = 0;

      for (const statement of citation.formalStatements) {
        try {
          const result = await this.validateStatement(statement, context);
          
          if (!result.valid) {
            overallValid = false;
          }
          
          totalConfidence += result.confidence;
          statementCount++;
          
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          
        } catch (error) {
          this.logger.error(`Error validating statement ${statement.id}`, error);
          overallValid = false;
          errors.push({
            type: 'logic',
            message: `Failed to validate statement: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      // Check consistency across all statements
      if (citation.formalStatements.length > 1) {
        const consistencyResult = await this.checkConsistency(
          citation.formalStatements,
          context
        );
        
        if (!consistencyResult.consistent) {
          overallValid = false;
          errors.push({
            type: 'logic',
            message: `Inconsistency detected: ${consistencyResult.contradictions.join(', ')}`
          });
        }
      }

      const averageConfidence = statementCount > 0 ? totalConfidence / statementCount : 0;
      const verificationTime = Date.now() - startTime;

      return {
        assistant: this.getType(),
        valid: overallValid,
        confidence: averageConfidence,
        errors,
        warnings,
        verificationTime,
        resourceUsage: {
          memory: this.getMemoryUsage(),
          cpu: this.getCPUUsage(),
          timeout: verificationTime > this.config.timeouts.fullVerification
        }
      };

    } catch (error) {
      this.logger.error(`Critical error in ${this.getType()} validation`, error);
      
      return {
        assistant: this.getType(),
        valid: false,
        confidence: 0,
        errors: [{
          type: 'logic',
          message: `Critical validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        warnings: [],
        verificationTime: Date.now() - startTime,
        resourceUsage: {
          memory: this.getMemoryUsage(),
          cpu: this.getCPUUsage(),
          timeout: true
        }
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ProofAssistantConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info(`Updated configuration for ${this.getType()}`, newConfig);
  }

  /**
   * Get current memory usage (to be overridden by specific implementations)
   */
  protected getMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  /**
   * Get current CPU usage (to be overridden by specific implementations)
   */
  protected getCPUUsage(): number {
    return process.cpuUsage().user + process.cpuUsage().system;
  }

  /**
   * Health check for the proof assistant
   */
  abstract healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    performance: {
      latency: number;
      throughput: number;
    };
  }>;

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    this.logger.info(`Cleaned up ${this.getType()} proof assistant`);
  }
}

/**
 * Proof Assistant Factory
 */
export class ProofAssistantFactory {
  private static assistants: Map<ProofAssistantType, new (config: ProofAssistantConfig) => BaseProofAssistant> = new Map();

  /**
   * Register a proof assistant implementation
   */
  static register(
    type: ProofAssistantType, 
    implementation: new (config: ProofAssistantConfig) => BaseProofAssistant
  ): void {
    this.assistants.set(type, implementation);
  }

  /**
   * Create a proof assistant instance
   */
  static create(type: ProofAssistantType, config: ProofAssistantConfig): BaseProofAssistant {
    const Implementation = this.assistants.get(type);
    
    if (!Implementation) {
      throw new Error(`Proof assistant ${type} not registered`);
    }

    return new Implementation(config);
  }

  /**
   * Get all registered proof assistant types
   */
  static getRegisteredTypes(): ProofAssistantType[] {
    return Array.from(this.assistants.keys());
  }

  /**
   * Check if a proof assistant type is registered
   */
  static isRegistered(type: ProofAssistantType): boolean {
    return this.assistants.has(type);
  }
}

export type { ConnectionStatus, ProofAssistantCapabilities };
