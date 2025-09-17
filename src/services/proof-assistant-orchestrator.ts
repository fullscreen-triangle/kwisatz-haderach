/**
 * Proof Assistant Orchestrator
 * 
 * Main service that coordinates multiple proof assistants for mathematical citation validation
 */

import type {
  ProofAssistantType,
  ProofAssistantConfig,
  ProofValidationResult,
  MathematicalCitation,
  ValidationContext,
  SingleProofResult,
  FormalStatement,
  LogicalContradiction
} from '@/types/proof-assistants';
import type { Citation } from '@/types/citations';

import { BaseProofAssistant, ProofAssistantFactory } from '@/core/proof-assistants/base-proof-assistant';
import { MathematicalExtractor } from './mathematical-extractor';
import { Logger } from '@/utils/logging';
import { PerformanceMonitor } from '@/utils/performance-monitor';

/**
 * Orchestrator status
 */
export type OrchestratorStatus = 'initializing' | 'ready' | 'busy' | 'error' | 'shutdown';

/**
 * Validation job
 */
interface ValidationJob {
  id: string;
  citation: MathematicalCitation;
  context?: ValidationContext;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: ProofValidationResult;
  error?: string;
}

/**
 * Performance metrics
 */
interface OrchestratorMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  assistantPerformance: Map<ProofAssistantType, {
    validations: number;
    successRate: number;
    averageTime: number;
    reliability: number;
  }>;
  lastUpdated: Date;
}

/**
 * Proof Assistant Orchestrator Service
 */
export class ProofAssistantOrchestrator {
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly mathExtractor: MathematicalExtractor;
  
  private status: OrchestratorStatus = 'initializing';
  private config: ProofAssistantConfig;
  private assistants: Map<ProofAssistantType, BaseProofAssistant> = new Map();
  private validationQueue: ValidationJob[] = [];
  private activeJobs: Map<string, ValidationJob> = new Map();
  private metrics: OrchestratorMetrics;
  private maxConcurrentJobs: number = 3;

  constructor(config: ProofAssistantConfig) {
    this.logger = Logger.getInstance();
    this.performanceMonitor = new PerformanceMonitor();
    this.mathExtractor = new MathematicalExtractor();
    this.config = config;
    
    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      averageValidationTime: 0,
      assistantPerformance: new Map(),
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize the orchestrator and all proof assistants
   */
  async initialize(): Promise<boolean> {
    this.logger.info('Initializing Proof Assistant Orchestrator');
    this.status = 'initializing';

    try {
      // Initialize primary proof assistant
      await this.initializeAssistant(this.config.primary);
      
      // Initialize fallback assistants
      for (const assistantType of this.config.fallbacks) {
        try {
          await this.initializeAssistant(assistantType);
        } catch (error) {
          this.logger.warn(`Failed to initialize fallback assistant ${assistantType}`, error);
          // Continue with other assistants
        }
      }

      // Verify at least one assistant is available
      if (this.assistants.size === 0) {
        throw new Error('No proof assistants could be initialized');
      }

      this.status = 'ready';
      this.logger.info('Proof Assistant Orchestrator initialized successfully', {
        assistants: Array.from(this.assistants.keys()),
        primary: this.config.primary
      });

      // Start processing queue
      this.startQueueProcessor();

      return true;

    } catch (error) {
      this.logger.error('Failed to initialize Proof Assistant Orchestrator', error);
      this.status = 'error';
      return false;
    }
  }

  /**
   * Validate mathematical citation with formal verification
   */
  async validateMathematicalCitation(
    citation: Citation,
    context?: ValidationContext
  ): Promise<ProofValidationResult> {
    this.logger.info('Starting mathematical citation validation', { citationId: citation.id });

    const startTime = Date.now();
    this.performanceMonitor.startOperation('mathematical_validation');

    try {
      // 1. Extract mathematical content
      const mathCitation = await this.mathExtractor.extractMathematicalContent(citation);
      
      // 2. Check if formal verification is needed
      if (!mathCitation.requiresFormalVerification) {
        this.logger.info('Citation does not require formal verification', { citationId: citation.id });
        return this.createBasicValidationResult(mathCitation);
      }

      // 3. Create validation job
      const job: ValidationJob = {
        id: this.generateJobId(),
        citation: mathCitation,
        context,
        priority: this.determinePriority(mathCitation, context),
        createdAt: new Date(),
        status: 'queued'
      };

      // 4. Execute validation (high priority jobs run immediately)
      if (job.priority === 'high' || this.validationQueue.length === 0) {
        return await this.executeValidationJob(job);
      } else {
        // Queue for later processing
        this.validationQueue.push(job);
        return await this.waitForJobCompletion(job.id);
      }

    } catch (error) {
      this.logger.error('Mathematical validation failed', error);
      this.metrics.failedValidations++;
      
      return {
        primaryValidation: {
          assistant: this.config.primary,
          valid: false,
          confidence: 0,
          errors: [{
            type: 'logic',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          warnings: [],
          verificationTime: Date.now() - startTime,
          resourceUsage: { memory: 0, cpu: 0, timeout: true }
        },
        crossValidation: new Map(),
        consistency: {
          internalConsistent: false,
          externalConsistent: false,
          contradictions: [],
          consistencyScore: 0
        },
        complexity: {
          proofLength: 0,
          dependencyDepth: 0,
          axiomDependencies: [],
          computationalComplexity: 'unknown',
          estimatedDifficulty: 0
        },
        metadata: {
          timestamp: new Date(),
          totalValidationTime: Date.now() - startTime,
          assistantsUsed: [],
          configurationUsed: this.config
        }
      };
    } finally {
      this.performanceMonitor.endOperation('mathematical_validation');
    }
  }

  /**
   * Perform cross-validation across multiple proof assistants
   */
  async performCrossValidation(
    statements: FormalStatement[],
    context?: ValidationContext
  ): Promise<Map<ProofAssistantType, SingleProofResult>> {
    this.logger.info('Performing cross-validation', { statementCount: statements.length });

    const results = new Map<ProofAssistantType, SingleProofResult>();
    const availableAssistants = Array.from(this.assistants.keys());

    // Run validation in parallel across available assistants
    const validationPromises = availableAssistants.map(async (assistantType) => {
      try {
        const assistant = this.assistants.get(assistantType)!;
        
        // Validate each statement and aggregate results
        const statementResults: SingleProofResult[] = [];
        
        for (const statement of statements) {
          const result = await assistant.validateStatement(statement, context);
          statementResults.push(result);
        }

        // Aggregate results
        const aggregated = this.aggregateValidationResults(statementResults, assistantType);
        results.set(assistantType, aggregated);

      } catch (error) {
        this.logger.error(`Cross-validation failed for ${assistantType}`, error);
        results.set(assistantType, {
          assistant: assistantType,
          valid: false,
          confidence: 0,
          errors: [{
            type: 'logic',
            message: `Cross-validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          warnings: [],
          verificationTime: 0,
          resourceUsage: { memory: 0, cpu: 0, timeout: true }
        });
      }
    });

    await Promise.all(validationPromises);
    
    this.logger.info('Cross-validation completed', {
      assistants: Array.from(results.keys()),
      successfulAssistants: Array.from(results.values()).filter(r => r.valid).length
    });

    return results;
  }

  /**
   * Check consistency across multiple citations
   */
  async checkConsistencyAcrossCitations(
    citations: MathematicalCitation[],
    context?: ValidationContext
  ): Promise<{
    consistent: boolean;
    contradictions: LogicalContradiction[];
    confidenceScore: number;
    detailedAnalysis: Map<string, any>;
  }> {
    this.logger.info('Checking consistency across citations', { citationCount: citations.length });

    try {
      // Collect all formal statements from all citations
      const allStatements: FormalStatement[] = [];
      const citationMap = new Map<string, string>();

      for (const citation of citations) {
        for (const statement of citation.formalStatements) {
          allStatements.push(statement);
          citationMap.set(statement.id, citation.id);
        }
      }

      // Use primary assistant for consistency checking
      const primaryAssistant = this.assistants.get(this.config.primary);
      if (!primaryAssistant) {
        throw new Error('Primary proof assistant not available');
      }

      const consistencyResult = await primaryAssistant.checkConsistency(allStatements, context);

      // Analyze contradictions in detail
      const detailedAnalysis = new Map<string, any>();
      const contradictions: LogicalContradiction[] = [];

      for (const contradiction of consistencyResult.contradictions) {
        // Try to identify which citations are involved
        const involvedCitations = Array.from(new Set(
          allStatements
            .filter(s => contradiction.includes(s.id))
            .map(s => citationMap.get(s.id))
            .filter(Boolean)
        ));

        contradictions.push({
          id: `contradiction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          statements: allStatements.filter(s => contradiction.includes(s.id)),
          description: contradiction,
          severity: 'major',
          resolution: `Review citations: ${involvedCitations.join(', ')}`
        });

        detailedAnalysis.set(contradiction, {
          involvedCitations,
          affectedStatements: allStatements.filter(s => contradiction.includes(s.id)).length,
          severity: 'major'
        });
      }

      return {
        consistent: consistencyResult.consistent,
        contradictions,
        confidenceScore: consistencyResult.confidence,
        detailedAnalysis
      };

    } catch (error) {
      this.logger.error('Consistency checking failed', error);
      return {
        consistent: false,
        contradictions: [{
          id: 'error_contradiction',
          statements: [],
          description: `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical'
        }],
        confidenceScore: 0,
        detailedAnalysis: new Map()
      };
    }
  }

  /**
   * Get orchestrator status and metrics
   */
  getStatus(): {
    status: OrchestratorStatus;
    metrics: OrchestratorMetrics;
    queueStatus: {
      queued: number;
      running: number;
      completed: number;
    };
    assistantStatus: Map<ProofAssistantType, string>;
  } {
    const queueStatus = {
      queued: this.validationQueue.length,
      running: this.activeJobs.size,
      completed: this.metrics.totalValidations
    };

    const assistantStatus = new Map<ProofAssistantType, string>();
    for (const [type, assistant] of this.assistants) {
      assistantStatus.set(type, assistant.getConnectionStatus());
    }

    return {
      status: this.status,
      metrics: this.metrics,
      queueStatus,
      assistantStatus
    };
  }

  /**
   * Shutdown the orchestrator and all assistants
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Proof Assistant Orchestrator');
    this.status = 'shutdown';

    // Stop queue processing
    this.stopQueueProcessor();

    // Wait for active jobs to complete (with timeout)
    const activeJobPromises = Array.from(this.activeJobs.values()).map(job => 
      this.waitForJobCompletion(job.id, 10000) // 10 second timeout
    );

    try {
      await Promise.allSettled(activeJobPromises);
    } catch (error) {
      this.logger.warn('Some jobs did not complete during shutdown', error);
    }

    // Shutdown all assistants
    for (const [type, assistant] of this.assistants) {
      try {
        await assistant.cleanup();
        this.logger.info(`Shutdown ${type} assistant`);
      } catch (error) {
        this.logger.error(`Failed to shutdown ${type} assistant`, error);
      }
    }

    this.assistants.clear();
    this.logger.info('Proof Assistant Orchestrator shutdown complete');
  }

  // Private helper methods

  private async initializeAssistant(type: ProofAssistantType): Promise<void> {
    this.logger.info(`Initializing ${type} proof assistant`);
    
    const assistant = ProofAssistantFactory.create(type, this.config);
    const initialized = await assistant.initialize();
    
    if (!initialized) {
      throw new Error(`Failed to initialize ${type} assistant`);
    }
    
    this.assistants.set(type, assistant);
    
    // Initialize performance tracking
    this.metrics.assistantPerformance.set(type, {
      validations: 0,
      successRate: 0,
      averageTime: 0,
      reliability: 1.0
    });
    
    this.logger.info(`${type} proof assistant initialized successfully`);
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determinePriority(
    citation: MathematicalCitation, 
    context?: ValidationContext
  ): 'low' | 'medium' | 'high' {
    // High priority: critical theorems, user requests formal verification
    if (context?.requirements.formalVerification) return 'high';
    if (citation.complexityAssessment === 'exponential' || citation.complexityAssessment === 'undecidable') return 'high';
    if (citation.mathematicalClaims.some(c => c.type === 'theorem')) return 'high';
    
    // Medium priority: lemmas, multiple claims
    if (citation.mathematicalClaims.length > 2) return 'medium';
    if (citation.mathematicalClaims.some(c => c.type === 'lemma')) return 'medium';
    
    return 'low';
  }

  private async executeValidationJob(job: ValidationJob): Promise<ProofValidationResult> {
    this.logger.info(`Executing validation job ${job.id}`);
    
    job.status = 'running';
    job.startedAt = new Date();
    this.activeJobs.set(job.id, job);

    const startTime = Date.now();

    try {
      // 1. Primary validation
      const primaryAssistant = this.assistants.get(this.config.primary);
      if (!primaryAssistant) {
        throw new Error('Primary assistant not available');
      }

      const primaryResult = await primaryAssistant.validateMathematicalCitation(
        job.citation, 
        job.context
      );

      // 2. Cross-validation if required
      let crossValidationResults = new Map<ProofAssistantType, SingleProofResult>();
      if (this.config.thresholds.requireCrossValidation || !primaryResult.valid) {
        crossValidationResults = await this.performCrossValidation(
          job.citation.formalStatements,
          job.context
        );
      }

      // 3. Consistency analysis
      const consistencyAnalysis = await this.analyzeConsistency(
        job.citation,
        job.context
      );

      // 4. Complexity analysis
      const complexityAnalysis = this.analyzeComplexity(job.citation);

      const verificationTime = Date.now() - startTime;

      const result: ProofValidationResult = {
        primaryValidation: primaryResult,
        crossValidation: crossValidationResults,
        consistency: consistencyAnalysis,
        complexity: complexityAnalysis,
        metadata: {
          timestamp: new Date(),
          totalValidationTime: verificationTime,
          assistantsUsed: [this.config.primary, ...Array.from(crossValidationResults.keys())],
          configurationUsed: this.config
        }
      };

      job.result = result;
      job.status = 'completed';
      job.completedAt = new Date();

      this.updateMetrics(result, verificationTime);

      return result;

    } catch (error) {
      this.logger.error(`Validation job ${job.id} failed`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  private createBasicValidationResult(citation: MathematicalCitation): ProofValidationResult {
    return {
      primaryValidation: {
        assistant: this.config.primary,
        valid: true,
        confidence: 0.8, // Moderate confidence for non-formal validation
        errors: [],
        warnings: [{
          type: 'clarity',
          message: 'Citation does not require formal verification'
        }],
        verificationTime: 0,
        resourceUsage: { memory: 0, cpu: 0, timeout: false }
      },
      crossValidation: new Map(),
      consistency: {
        internalConsistent: true,
        externalConsistent: true,
        contradictions: [],
        consistencyScore: 0.8
      },
      complexity: {
        proofLength: 0,
        dependencyDepth: 0,
        axiomDependencies: [],
        computationalComplexity: citation.complexityAssessment,
        estimatedDifficulty: 0.2
      },
      metadata: {
        timestamp: new Date(),
        totalValidationTime: 0,
        assistantsUsed: [],
        configurationUsed: this.config
      }
    };
  }

  private async waitForJobCompletion(jobId: string, timeout: number = 60000): Promise<ProofValidationResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkJob = () => {
        const job = this.activeJobs.get(jobId) || 
                    this.validationQueue.find(j => j.id === jobId);
        
        if (job?.status === 'completed' && job.result) {
          resolve(job.result);
        } else if (job?.status === 'failed') {
          reject(new Error(job.error || 'Job failed'));
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Job timeout'));
        } else {
          setTimeout(checkJob, 1000); // Check every second
        }
      };
      
      checkJob();
    });
  }

  private aggregateValidationResults(
    results: SingleProofResult[], 
    assistantType: ProofAssistantType
  ): SingleProofResult {
    const validCount = results.filter(r => r.valid).length;
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);
    const totalTime = results.reduce((sum, r) => sum + r.verificationTime, 0);

    return {
      assistant: assistantType,
      valid: validCount === results.length,
      confidence: results.length > 0 ? totalConfidence / results.length : 0,
      errors: allErrors,
      warnings: allWarnings,
      verificationTime: totalTime,
      resourceUsage: {
        memory: Math.max(...results.map(r => r.resourceUsage.memory)),
        cpu: Math.max(...results.map(r => r.resourceUsage.cpu)),
        timeout: results.some(r => r.resourceUsage.timeout)
      }
    };
  }

  private async analyzeConsistency(
    citation: MathematicalCitation,
    context?: ValidationContext
  ): Promise<ProofValidationResult['consistency']> {
    try {
      const primaryAssistant = this.assistants.get(this.config.primary);
      if (!primaryAssistant) {
        throw new Error('Primary assistant not available');
      }

      const consistencyResult = await primaryAssistant.checkConsistency(
        citation.formalStatements,
        context
      );

      return {
        internalConsistent: consistencyResult.consistent,
        externalConsistent: true, // Would need broader context to determine
        contradictions: consistencyResult.contradictions.map(c => ({
          id: `contradiction_${Date.now()}`,
          statements: [],
          description: c,
          severity: 'major' as const
        })),
        consistencyScore: consistencyResult.confidence
      };

    } catch (error) {
      return {
        internalConsistent: false,
        externalConsistent: false,
        contradictions: [{
          id: 'consistency_error',
          statements: [],
          description: `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical'
        }],
        consistencyScore: 0
      };
    }
  }

  private analyzeComplexity(citation: MathematicalCitation): ProofValidationResult['complexity'] {
    return {
      proofLength: citation.formalStatements.length,
      dependencyDepth: citation.mathematicalDependencies.length,
      axiomDependencies: [], // Would need deeper analysis
      computationalComplexity: citation.complexityAssessment,
      estimatedDifficulty: this.calculateDifficulty(citation)
    };
  }

  private calculateDifficulty(citation: MathematicalCitation): number {
    let difficulty = 0;
    
    // Base difficulty on statement count
    difficulty += citation.formalStatements.length * 0.1;
    
    // Increase for theorem-level claims
    difficulty += citation.mathematicalClaims.filter(c => c.type === 'theorem').length * 0.3;
    
    // Complexity assessment impact
    switch (citation.complexityAssessment) {
      case 'trivial': difficulty += 0.1; break;
      case 'polynomial': difficulty += 0.5; break;
      case 'exponential': difficulty += 0.8; break;
      case 'undecidable': difficulty += 1.0; break;
    }
    
    return Math.min(difficulty, 1.0);
  }

  private updateMetrics(result: ProofValidationResult, verificationTime: number): void {
    this.metrics.totalValidations++;
    
    if (result.primaryValidation.valid) {
      this.metrics.successfulValidations++;
    } else {
      this.metrics.failedValidations++;
    }
    
    // Update average validation time
    this.metrics.averageValidationTime = 
      (this.metrics.averageValidationTime * (this.metrics.totalValidations - 1) + verificationTime) / 
      this.metrics.totalValidations;
    
    // Update assistant performance
    for (const assistantType of result.metadata.assistantsUsed) {
      const performance = this.metrics.assistantPerformance.get(assistantType);
      if (performance) {
        performance.validations++;
        performance.successRate = 
          (performance.successRate * (performance.validations - 1) + 
           (result.primaryValidation.valid ? 1 : 0)) / performance.validations;
        performance.averageTime = 
          (performance.averageTime * (performance.validations - 1) + verificationTime) / 
          performance.validations;
      }
    }
    
    this.metrics.lastUpdated = new Date();
  }

  private queueProcessor?: NodeJS.Timer;

  private startQueueProcessor(): void {
    this.queueProcessor = setInterval(async () => {
      if (this.validationQueue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
        const job = this.validationQueue.shift()!;
        
        // Don't await - let it run in background
        this.executeValidationJob(job).catch(error => {
          this.logger.error(`Background job ${job.id} failed`, error);
        });
      }
    }, 1000);
  }

  private stopQueueProcessor(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = undefined;
    }
  }
}

export { ProofAssistantOrchestrator };
export type { ValidationJob, OrchestratorMetrics, OrchestratorStatus };
