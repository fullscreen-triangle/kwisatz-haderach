/**
 * Enhanced Validation Service with Proof Assistant Integration
 * 
 * Combines the original Triple Validation Architecture with formal mathematical verification
 */

import type { Citation } from '@/types/citations';
import type {
  TripleValidationResult,
  ValidationContext as BaseValidationContext
} from '@/types/validation';
import type {
  ProofValidationResult,
  ValidationContext as ProofValidationContext,
  ProofAssistantConfig
} from '@/types/proof-assistants';

import { ValidationService } from './validation-service';
import { ProofAssistantOrchestrator } from './proof-assistant-orchestrator';
import { MathematicalExtractor } from './mathematical-extractor';
import { Logger } from '@/utils/logging';
import { PerformanceMonitor } from '@/utils/performance-monitor';

/**
 * Enhanced validation result that combines traditional and formal validation
 */
export interface EnhancedValidationResult {
  /** Traditional triple validation result */
  tripleValidation: TripleValidationResult;
  
  /** Formal mathematical validation result (if applicable) */
  formalValidation?: ProofValidationResult;
  
  /** Combined assessment */
  overallAssessment: {
    isValid: boolean;
    confidence: number;
    requiresAttention: boolean;
    criticalIssues: string[];
    recommendations: string[];
  };
  
  /** Mathematical content assessment */
  mathematicalContent: {
    hasMathematicalClaims: boolean;
    requiresFormalVerification: boolean;
    mathematicalDomains: string[];
    complexityLevel: string;
  };
  
  /** Validation metadata */
  metadata: {
    validationMode: 'standard' | 'enhanced' | 'formal';
    processingTime: number;
    timestamp: Date;
    validationLevels: string[];
  };
}

/**
 * Enhanced validation configuration
 */
export interface EnhancedValidationConfig {
  /** Enable formal mathematical verification */
  enableFormalVerification: boolean;
  
  /** Automatic mathematical content detection */
  autoDetectMathematicalContent: boolean;
  
  /** Minimum confidence threshold for formal verification */
  formalVerificationThreshold: number;
  
  /** Proof assistant configuration */
  proofAssistantConfig: ProofAssistantConfig;
  
  /** Validation mode preferences */
  validationMode: 'adaptive' | 'always_formal' | 'traditional_only';
  
  /** Performance settings */
  performance: {
    enableParallelValidation: boolean;
    maxValidationTime: number;
    cacheResults: boolean;
  };
}

/**
 * Enhanced Validation Service
 */
export class EnhancedValidationService {
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly traditionValidationService: ValidationService;
  private readonly proofOrchestrator: ProofAssistantOrchestrator;
  private readonly mathExtractor: MathematicalExtractor;
  private readonly config: EnhancedValidationConfig;

  constructor(config: EnhancedValidationConfig) {
    this.logger = Logger.getInstance();
    this.performanceMonitor = new PerformanceMonitor();
    this.config = config;
    
    // Initialize traditional validation service
    this.traditionValidationService = new ValidationService();
    
    // Initialize proof assistant orchestrator
    this.proofOrchestrator = new ProofAssistantOrchestrator(config.proofAssistantConfig);
    
    // Initialize mathematical extractor
    this.mathExtractor = new MathematicalExtractor();
  }

  /**
   * Initialize the enhanced validation service
   */
  async initialize(): Promise<boolean> {
    this.logger.info('Initializing Enhanced Validation Service');

    try {
      // Initialize proof assistant orchestrator
      const proofInitialized = await this.proofOrchestrator.initialize();
      
      if (!proofInitialized && this.config.enableFormalVerification) {
        this.logger.warn('Proof assistant initialization failed - formal verification disabled');
        // Continue with traditional validation only
      }

      this.logger.info('Enhanced Validation Service initialized successfully', {
        formalVerificationEnabled: this.config.enableFormalVerification && proofInitialized,
        validationMode: this.config.validationMode
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to initialize Enhanced Validation Service', error);
      return false;
    }
  }

  /**
   * Validate citation with enhanced multi-level validation
   */
  async validateCitation(
    citation: Citation,
    context?: BaseValidationContext
  ): Promise<EnhancedValidationResult> {
    this.logger.info('Starting enhanced citation validation', { citationId: citation.id });

    const startTime = Date.now();
    this.performanceMonitor.startOperation('enhanced_validation');

    try {
      // 1. Always perform traditional triple validation
      const tripleValidationPromise = this.performTripleValidation(citation, context);

      // 2. Detect mathematical content
      const mathContentPromise = this.analyzeMathematicalContent(citation);

      // Execute in parallel for performance
      const [tripleValidation, mathContent] = await Promise.all([
        tripleValidationPromise,
        mathContentPromise
      ]);

      // 3. Determine if formal verification is needed
      const needsFormalVerification = this.shouldPerformFormalVerification(
        mathContent,
        tripleValidation,
        context
      );

      // 4. Perform formal verification if needed
      let formalValidation: ProofValidationResult | undefined;
      
      if (needsFormalVerification && this.config.enableFormalVerification) {
        formalValidation = await this.performFormalValidation(citation, context);
      }

      // 5. Combine results and create overall assessment
      const overallAssessment = this.createOverallAssessment(
        tripleValidation,
        formalValidation,
        mathContent
      );

      const processingTime = Date.now() - startTime;

      const result: EnhancedValidationResult = {
        tripleValidation,
        formalValidation,
        overallAssessment,
        mathematicalContent: {
          hasMathematicalClaims: mathContent.hasMathematicalClaims,
          requiresFormalVerification: mathContent.requiresFormalVerification,
          mathematicalDomains: mathContent.mathematicalDomains,
          complexityLevel: mathContent.complexityLevel
        },
        metadata: {
          validationMode: this.determineValidationMode(needsFormalVerification, formalValidation),
          processingTime,
          timestamp: new Date(),
          validationLevels: this.getValidationLevels(tripleValidation, formalValidation)
        }
      };

      this.logger.info('Enhanced validation completed', {
        citationId: citation.id,
        validationMode: result.metadata.validationMode,
        processingTime,
        isValid: result.overallAssessment.isValid
      });

      return result;

    } catch (error) {
      this.logger.error('Enhanced validation failed', error);
      
      // Return minimal result on failure
      return this.createErrorResult(citation, error, Date.now() - startTime);

    } finally {
      this.performanceMonitor.endOperation('enhanced_validation');
    }
  }

  /**
   * Validate multiple citations with consistency checking
   */
  async validateMultipleCitations(
    citations: Citation[],
    context?: BaseValidationContext
  ): Promise<{
    individualResults: Map<string, EnhancedValidationResult>;
    consistencyAnalysis: {
      consistent: boolean;
      contradictions: string[];
      confidenceScore: number;
      recommendations: string[];
    };
    overallAssessment: {
      validCitations: number;
      totalCitations: number;
      averageConfidence: number;
      criticalIssuesCount: number;
    };
  }> {
    this.logger.info('Starting multiple citation validation', { citationCount: citations.length });

    const individualResults = new Map<string, EnhancedValidationResult>();
    
    // 1. Validate each citation individually
    const validationPromises = citations.map(async (citation) => {
      const result = await this.validateCitation(citation, context);
      individualResults.set(citation.id, result);
      return result;
    });

    await Promise.all(validationPromises);

    // 2. Extract mathematical citations for consistency checking
    const mathCitations = Array.from(individualResults.entries())
      .filter(([, result]) => result.mathematicalContent.hasMathematicalClaims)
      .map(([id]) => citations.find(c => c.id === id)!)
      .filter(Boolean);

    // 3. Perform cross-citation consistency analysis
    let consistencyAnalysis = {
      consistent: true,
      contradictions: [] as string[],
      confidenceScore: 1.0,
      recommendations: [] as string[]
    };

    if (mathCitations.length > 1 && this.config.enableFormalVerification) {
      try {
        const mathCitationsEnhanced = await Promise.all(
          mathCitations.map(c => this.mathExtractor.extractMathematicalContent(c))
        );

        const consistencyResult = await this.proofOrchestrator.checkConsistencyAcrossCitations(
          mathCitationsEnhanced,
          this.convertToProofValidationContext(context)
        );

        consistencyAnalysis = {
          consistent: consistencyResult.consistent,
          contradictions: consistencyResult.contradictions.map(c => c.description),
          confidenceScore: consistencyResult.confidenceScore,
          recommendations: this.generateConsistencyRecommendations(consistencyResult)
        };

      } catch (error) {
        this.logger.error('Consistency analysis failed', error);
        consistencyAnalysis.recommendations.push('Manual consistency review recommended due to analysis failure');
      }
    }

    // 4. Create overall assessment
    const validResults = Array.from(individualResults.values()).filter(r => r.overallAssessment.isValid);
    const totalConfidence = Array.from(individualResults.values())
      .reduce((sum, r) => sum + r.overallAssessment.confidence, 0);
    const criticalIssues = Array.from(individualResults.values())
      .reduce((sum, r) => sum + r.overallAssessment.criticalIssues.length, 0);

    const overallAssessment = {
      validCitations: validResults.length,
      totalCitations: citations.length,
      averageConfidence: individualResults.size > 0 ? totalConfidence / individualResults.size : 0,
      criticalIssuesCount: criticalIssues
    };

    return {
      individualResults,
      consistencyAnalysis,
      overallAssessment
    };
  }

  /**
   * Get service status and performance metrics
   */
  getServiceStatus(): {
    traditional: any;
    proofAssistant: any;
    performance: {
      totalValidations: number;
      averageTime: number;
      successRate: number;
    };
  } {
    const proofStatus = this.proofOrchestrator.getStatus();
    
    return {
      traditional: { status: 'ready' }, // Traditional service is always ready
      proofAssistant: proofStatus,
      performance: {
        totalValidations: proofStatus.metrics.totalValidations,
        averageTime: proofStatus.metrics.averageValidationTime,
        successRate: proofStatus.metrics.totalValidations > 0 ? 
          proofStatus.metrics.successfulValidations / proofStatus.metrics.totalValidations : 0
      }
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Enhanced Validation Service');
    await this.proofOrchestrator.shutdown();
  }

  // Private helper methods

  private async performTripleValidation(
    citation: Citation,
    context?: BaseValidationContext
  ): Promise<TripleValidationResult> {
    // Use the existing validation service
    return await this.traditionValidationService.validateCitation(citation, context);
  }

  private async analyzeMathematicalContent(citation: Citation): Promise<{
    hasMathematicalClaims: boolean;
    requiresFormalVerification: boolean;
    mathematicalDomains: string[];
    complexityLevel: string;
  }> {
    try {
      const mathCitation = await this.mathExtractor.extractMathematicalContent(citation);
      
      return {
        hasMathematicalClaims: mathCitation.mathematicalClaims.length > 0,
        requiresFormalVerification: mathCitation.requiresFormalVerification,
        mathematicalDomains: mathCitation.mathematicalDomains.map(d => d.toString()),
        complexityLevel: mathCitation.complexityAssessment
      };
    } catch (error) {
      this.logger.warn('Mathematical content analysis failed', error);
      return {
        hasMathematicalClaims: false,
        requiresFormalVerification: false,
        mathematicalDomains: [],
        complexityLevel: 'unknown'
      };
    }
  }

  private shouldPerformFormalVerification(
    mathContent: any,
    tripleValidation: TripleValidationResult,
    context?: BaseValidationContext
  ): boolean {
    // Always perform if explicitly requested
    if (context && (context as any).requiresFormalVerification) return true;
    
    // Perform based on configuration
    switch (this.config.validationMode) {
      case 'always_formal':
        return mathContent.hasMathematicalClaims;
      
      case 'traditional_only':
        return false;
      
      case 'adaptive':
      default:
        // Adaptive logic
        if (!mathContent.hasMathematicalClaims) return false;
        if (mathContent.requiresFormalVerification) return true;
        if (mathContent.complexityLevel === 'exponential' || mathContent.complexityLevel === 'undecidable') return true;
        if (tripleValidation.overallResult.confidence < this.config.formalVerificationThreshold) return true;
        return false;
    }
  }

  private async performFormalValidation(
    citation: Citation,
    context?: BaseValidationContext
  ): Promise<ProofValidationResult> {
    const proofContext = this.convertToProofValidationContext(context);
    return await this.proofOrchestrator.validateMathematicalCitation(citation, proofContext);
  }

  private convertToProofValidationContext(context?: BaseValidationContext): ProofValidationContext | undefined {
    if (!context) return undefined;

    return {
      relatedCitations: [], // Would need to be populated from context
      documentContext: {
        title: context.document?.title || 'Unknown',
        authors: context.document?.authors || [],
        domain: 'mathematics' as any, // Would need proper mapping
        abstractContent: context.document?.abstract || ''
      },
      userContext: {
        expertiseLevel: 'intermediate', // Would need to be determined
        mathBackground: []
      },
      requirements: {
        formalVerification: true,
        crossValidation: this.config.proofAssistantConfig.thresholds.requireCrossValidation,
        consistencyCheck: true,
        performanceCheck: true
      }
    };
  }

  private createOverallAssessment(
    tripleValidation: TripleValidationResult,
    formalValidation?: ProofValidationResult,
    mathContent?: any
  ): EnhancedValidationResult['overallAssessment'] {
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Analyze traditional validation
    let confidence = tripleValidation.overallResult.confidence;
    let isValid = tripleValidation.overallResult.isValid;

    // If we have formal validation, factor it in
    if (formalValidation) {
      const formalValid = formalValidation.primaryValidation.valid;
      const formalConfidence = formalValidation.primaryValidation.confidence;

      // Weighted combination (formal validation gets higher weight for mathematical content)
      const formalWeight = mathContent?.hasMathematicalClaims ? 0.7 : 0.3;
      confidence = (confidence * (1 - formalWeight)) + (formalConfidence * formalWeight);
      
      // Both must be valid for overall validity
      isValid = isValid && formalValid;

      // Add formal validation issues
      if (!formalValid) {
        criticalIssues.push('Formal mathematical verification failed');
      }

      if (formalValidation.consistency.contradictions.length > 0) {
        criticalIssues.push('Mathematical consistency issues detected');
      }
    }

    // Add traditional validation issues
    for (const issue of tripleValidation.overallResult.criticalIssues) {
      criticalIssues.push(issue);
    }

    // Generate recommendations
    if (mathContent?.hasMathematicalClaims && !formalValidation) {
      recommendations.push('Consider formal mathematical verification for this citation');
    }

    if (confidence < 0.7) {
      recommendations.push('Citation requires additional review due to low confidence score');
    }

    const requiresAttention = criticalIssues.length > 0 || confidence < 0.6;

    return {
      isValid,
      confidence,
      requiresAttention,
      criticalIssues,
      recommendations: [...tripleValidation.overallResult.recommendations, ...recommendations]
    };
  }

  private determineValidationMode(
    needsFormalVerification: boolean,
    formalValidation?: ProofValidationResult
  ): 'standard' | 'enhanced' | 'formal' {
    if (formalValidation) return 'formal';
    if (needsFormalVerification) return 'enhanced';
    return 'standard';
  }

  private getValidationLevels(
    tripleValidation: TripleValidationResult,
    formalValidation?: ProofValidationResult
  ): string[] {
    const levels = ['intent', 'boundary', 'bias']; // From triple validation
    
    if (formalValidation) {
      levels.push('mathematical', 'formal_proof');
    }
    
    return levels;
  }

  private createErrorResult(citation: Citation, error: any, processingTime: number): EnhancedValidationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    
    return {
      tripleValidation: {
        intentValidation: {
          isValid: false,
          confidence: 0,
          issues: [{ type: 'error', message: errorMessage, severity: 'high' }]
        } as any,
        boundaryValidation: {
          isValid: false,
          confidence: 0,
          issues: [{ type: 'error', message: errorMessage, severity: 'high' }]
        } as any,
        biasValidation: {
          isValid: false,
          confidence: 0,
          issues: [{ type: 'error', message: errorMessage, severity: 'high' }]
        } as any,
        overallResult: {
          isValid: false,
          confidence: 0,
          criticalIssues: [errorMessage],
          recommendations: ['Manual review required due to validation error']
        }
      } as any,
      overallAssessment: {
        isValid: false,
        confidence: 0,
        requiresAttention: true,
        criticalIssues: [errorMessage],
        recommendations: ['Manual review required due to validation error']
      },
      mathematicalContent: {
        hasMathematicalClaims: false,
        requiresFormalVerification: false,
        mathematicalDomains: [],
        complexityLevel: 'unknown'
      },
      metadata: {
        validationMode: 'standard',
        processingTime,
        timestamp: new Date(),
        validationLevels: ['error']
      }
    };
  }

  private generateConsistencyRecommendations(consistencyResult: any): string[] {
    const recommendations: string[] = [];
    
    if (!consistencyResult.consistent) {
      recommendations.push('Review mathematical claims for logical consistency');
      recommendations.push('Consider revising citations that create contradictions');
    }
    
    if (consistencyResult.confidenceScore < 0.7) {
      recommendations.push('Mathematical consistency analysis has low confidence - manual review recommended');
    }
    
    return recommendations;
  }
}

export { EnhancedValidationService };
export type { EnhancedValidationResult, EnhancedValidationConfig };
