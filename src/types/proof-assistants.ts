/**
 * Proof Assistant Types for Kwisatz-Haderach Citation Intelligence Framework
 * 
 * Defines interfaces for mathematical proof validation and formal verification
 */

import type { Citation, AcademicDomain } from './citations.js';

/**
 * Supported proof assistants
 */
export type ProofAssistantType = 'lean' | 'coq' | 'isabelle' | 'agda';

/**
 * Mathematical complexity classes
 */
export type ComplexityClass = 
  | 'polynomial'
  | 'exponential' 
  | 'undecidable'
  | 'unknown'
  | 'trivial';

/**
 * Mathematical statement types
 */
export type MathStatementType = 
  | 'theorem'
  | 'lemma'
  | 'definition'
  | 'axiom'
  | 'corollary'
  | 'proposition'
  | 'conjecture';

/**
 * Formal mathematical statement
 */
export interface FormalStatement {
  /** Unique identifier */
  id: string;
  
  /** Natural language statement */
  naturalLanguage: string;
  
  /** Formal representations in different proof assistants */
  formalRepresentations: Map<ProofAssistantType, string>;
  
  /** Statement type */
  type: MathStatementType;
  
  /** Mathematical domain */
  domain: AcademicDomain;
  
  /** Dependencies on other statements */
  dependencies: string[];
  
  /** Variables and their types */
  variables: Variable[];
  
  /** Hypotheses */
  hypotheses: string[];
  
  /** Conclusion */
  conclusion: string;
  
  /** LaTeX representation */
  latex?: string;
  
  /** Confidence in extraction accuracy */
  extractionConfidence: number;
}

/**
 * Variable in mathematical statement
 */
export interface Variable {
  name: string;
  type: string;
  domain?: string;
  constraints?: string[];
}

/**
 * Mathematical claim extracted from citation
 */
export interface MathClaim {
  /** Claim identifier */
  id: string;
  
  /** Natural language claim */
  claim: string;
  
  /** Formal statements supporting this claim */
  formalStatements: FormalStatement[];
  
  /** Citation location */
  location: {
    start: number;
    end: number;
  };
  
  /** Claim type */
  type: MathStatementType;
  
  /** Evidence strength */
  evidenceStrength: number;
  
  /** Dependencies on other claims */
  dependencies: string[];
}

/**
 * Proof sketch for mathematical reasoning
 */
export interface ProofSketch {
  /** Proof identifier */
  id: string;
  
  /** Main theorem or claim */
  mainClaim: string;
  
  /** Proof steps */
  steps: ProofStep[];
  
  /** Proof strategy */
  strategy: ProofStrategy;
  
  /** Estimated complexity */
  complexity: ComplexityClass;
  
  /** Required lemmas */
  requiredLemmas: string[];
}

/**
 * Individual proof step
 */
export interface ProofStep {
  /** Step number */
  stepNumber: number;
  
  /** Natural language description */
  description: string;
  
  /** Formal representation (if available) */
  formalStep?: string;
  
  /** Justification */
  justification: string;
  
  /** Dependencies on previous steps */
  dependencies: number[];
}

/**
 * Proof strategy
 */
export type ProofStrategy = 
  | 'direct'
  | 'contradiction'
  | 'induction'
  | 'construction'
  | 'case_analysis'
  | 'reduction'
  | 'equivalence';

/**
 * Logical contradiction detected
 */
export interface LogicalContradiction {
  /** Contradiction identifier */
  id: string;
  
  /** Contradictory statements */
  statements: FormalStatement[];
  
  /** Description of contradiction */
  description: string;
  
  /** Severity level */
  severity: 'minor' | 'major' | 'critical';
  
  /** Suggested resolution */
  resolution?: string;
}

/**
 * Proof validation error
 */
export interface ValidationError {
  /** Error type */
  type: 'syntax' | 'type' | 'logic' | 'incomplete' | 'timeout';
  
  /** Error message */
  message: string;
  
  /** Location in proof */
  location?: {
    line: number;
    column: number;
  };
  
  /** Suggested fix */
  suggestedFix?: string;
}

/**
 * Proof validation warning
 */
export interface ValidationWarning {
  /** Warning type */
  type: 'style' | 'performance' | 'redundancy' | 'clarity';
  
  /** Warning message */
  message: string;
  
  /** Location in proof */
  location?: {
    line: number;
    column: number;
  };
  
  /** Improvement suggestion */
  suggestion?: string;
}

/**
 * Single proof assistant validation result
 */
export interface SingleProofResult {
  /** Proof assistant used */
  assistant: ProofAssistantType;
  
  /** Validation success */
  valid: boolean;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Generated formal proof */
  formalProof?: string;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
  
  /** Verification time (ms) */
  verificationTime: number;
  
  /** Resources used */
  resourceUsage: {
    memory: number;
    cpu: number;
    timeout: boolean;
  };
}

/**
 * Complete proof validation result
 */
export interface ProofValidationResult {
  /** Primary validation result */
  primaryValidation: SingleProofResult;
  
  /** Cross-validation results */
  crossValidation: Map<ProofAssistantType, SingleProofResult>;
  
  /** Overall consistency analysis */
  consistency: {
    internalConsistent: boolean;
    externalConsistent: boolean;
    contradictions: LogicalContradiction[];
    consistencyScore: number;
  };
  
  /** Proof complexity metrics */
  complexity: {
    proofLength: number;
    dependencyDepth: number;
    axiomDependencies: string[];
    computationalComplexity: ComplexityClass;
    estimatedDifficulty: number;
  };
  
  /** Validation metadata */
  metadata: {
    timestamp: Date;
    totalValidationTime: number;
    assistantsUsed: ProofAssistantType[];
    configurationUsed: ProofAssistantConfig;
  };
}

/**
 * Enhanced mathematical citation
 */
export interface MathematicalCitation extends Citation {
  /** Mathematical claims made in citation */
  mathematicalClaims: MathClaim[];
  
  /** Formal statements extracted */
  formalStatements: FormalStatement[];
  
  /** Proof sketches provided */
  proofOutlines: ProofSketch[];
  
  /** Dependencies on other mathematical results */
  mathematicalDependencies: string[];
  
  /** Mathematical domain classification */
  mathematicalDomains: AcademicDomain[];
  
  /** Complexity assessment */
  complexityAssessment: ComplexityClass;
  
  /** Requires formal verification */
  requiresFormalVerification: boolean;
}

/**
 * Proof assistant configuration
 */
export interface ProofAssistantConfig {
  /** Primary proof assistant */
  primary: ProofAssistantType;
  
  /** Fallback assistants for cross-validation */
  fallbacks: ProofAssistantType[];
  
  /** Domain-specific configurations */
  domainSpecializations: Map<AcademicDomain, ProofAssistantType>;
  
  /** Timeout settings */
  timeouts: {
    quickCheck: number;
    fullVerification: number;
    crossValidation: number;
    maxTotalTime: number;
  };
  
  /** Performance settings */
  performance: {
    enableCaching: boolean;
    enableParallel: boolean;
    maxConcurrent: number;
    memoryLimit: number;
  };
  
  /** Validation thresholds */
  thresholds: {
    minimumConfidence: number;
    requireCrossValidation: boolean;
    maxErrorsAllowed: number;
    consistencyThreshold: number;
  };
}

/**
 * Validation context for mathematical proofs
 */
export interface ValidationContext {
  /** Related citations for context */
  relatedCitations: Citation[];
  
  /** Document context */
  documentContext: {
    title: string;
    authors: string[];
    domain: AcademicDomain;
    abstractContent: string;
  };
  
  /** User context */
  userContext: {
    expertiseLevel: 'novice' | 'intermediate' | 'expert';
    preferredAssistant?: ProofAssistantType;
    mathBackground: AcademicDomain[];
  };
  
  /** Validation requirements */
  requirements: {
    formalVerification: boolean;
    crossValidation: boolean;
    consistencyCheck: boolean;
    performanceCheck: boolean;
  };
}

/**
 * Mathematical translation result
 */
export interface TranslationResult {
  /** Successfully translated */
  success: boolean;
  
  /** Formal representation */
  formalStatement?: string;
  
  /** Translation confidence */
  confidence: number;
  
  /** Intermediate representations */
  intermediateSteps: string[];
  
  /** Translation errors */
  errors: string[];
  
  /** Ambiguities detected */
  ambiguities: {
    description: string;
    possibleInterpretations: string[];
  }[];
}

/**
 * Proof search result
 */
export interface ProofSearchResult {
  /** Proof found */
  proofFound: boolean;
  
  /** Generated proof */
  proof?: string;
  
  /** Search strategy used */
  strategy: string;
  
  /** Search time */
  searchTime: number;
  
  /** Search depth reached */
  depthReached: number;
  
  /** Alternative proofs */
  alternatives: string[];
}

// Export all types
export type {
  ProofAssistantType,
  ComplexityClass,
  MathStatementType,
  FormalStatement,
  Variable,
  MathClaim,
  ProofSketch,
  ProofStep,
  ProofStrategy,
  LogicalContradiction,
  ValidationError,
  ValidationWarning,
  SingleProofResult,
  ProofValidationResult,
  MathematicalCitation,
  ProofAssistantConfig,
  ValidationContext,
  TranslationResult,
  ProofSearchResult
};
