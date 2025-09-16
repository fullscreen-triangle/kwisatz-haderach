/**
 * Validation Architecture types for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * These types implement the Integrated Validation Architecture framework,
 * providing triple validation through Intent, Boundary, and Systematic Bias validation.
 */

import type { Citation, CitationContext, AcademicDomain, QualityAssessment } from './citations.js';
import type { ModelConfig, ModelResponse } from './models.js';

// ========== Core Validation Framework ==========

/**
 * Triple validation result combining all validation mechanisms
 */
export interface TripleValidationResult {
  /** Overall validation status */
  status: ValidationStatus;
  
  /** Intent validation results */
  intent: IntentValidationResult;
  
  /** Boundary validation results */
  boundary: BoundaryValidationResult;
  
  /** Systematic bias validation results */
  systematicBias: SystematicBiasValidationResult;
  
  /** Combined validation confidence */
  overallConfidence: number;
  
  /** Validation metadata */
  metadata: ValidationMetadata;
  
  /** Recommendations based on validation */
  recommendations: ValidationRecommendation[];
}

/**
 * Validation status enumeration
 */
export type ValidationStatus = 
  | 'valid'
  | 'invalid'
  | 'warning'
  | 'pending'
  | 'error'
  | 'requires-human-review';

/**
 * Base validation result interface
 */
export interface BaseValidationResult {
  /** Validation passed */
  passed: boolean;
  
  /** Confidence in validation */
  confidence: number;
  
  /** Validation score (0-100) */
  score: number;
  
  /** Issues found */
  issues: ValidationIssue[];
  
  /** Processing time (ms) */
  processingTime: number;
  
  /** Models used for validation */
  modelsUsed: string[];
}

// ========== Intent Validation (Core Framework Component) ==========

/**
 * Intent validation result implementing the Intent Validation Paradox solution
 */
export interface IntentValidationResult extends BaseValidationResult {
  /** Does citation address actual user intent? */
  addressesActualIntent: boolean;
  
  /** Intent inference confidence */
  intentInferenceConfidence: number;
  
  /** Interrogative analysis results */
  interrogativeAnalysis: InterrogativeAnalysisResult;
  
  /** Counterfactual reasoning results */
  counterfactualAnalysis: CounterfactualAnalysisResult;
  
  /** Goal inference results */
  goalInference: GoalInferenceResult;
  
  /** Expression analysis results */
  expressionAnalysis: ExpressionAnalysisResult;
  
  /** Alternative intent interpretations */
  alternativeInterpretations: IntentInterpretation[];
}

/**
 * Interrogative analysis results
 */
export interface InterrogativeAnalysisResult {
  /** Motivational analysis - why this citation? */
  motivationalAnalysis: MotivationalAnalysis;
  
  /** Goal inference - what objectives? */
  goalAnalysis: GoalAnalysis;
  
  /** Expression analysis - why this phrasing? */
  expressionAnalysis: ExpressionAnalysis;
  
  /** Conditional analysis - given user knowledge */
  conditionalAnalysis: ConditionalAnalysis;
  
  /** Temporal analysis - time-sensitive factors */
  temporalAnalysis: TemporalAnalysis;
}

/**
 * Motivational analysis for citations
 */
export interface MotivationalAnalysis {
  /** Primary motivation identified */
  primaryMotivation: CitationMotivation;
  
  /** Secondary motivations */
  secondaryMotivations: CitationMotivation[];
  
  /** Confidence in motivation identification */
  confidence: number;
  
  /** Supporting evidence */
  evidence: string[];
}

/**
 * Citation motivations
 */
export type CitationMotivation = 
  | 'support-argument'
  | 'provide-evidence'
  | 'establish-authority'
  | 'show-precedent'
  | 'contrast-viewpoint'
  | 'provide-context'
  | 'demonstrate-knowledge'
  | 'fulfill-requirement'
  | 'avoid-plagiarism'
  | 'strengthen-credibility';

/**
 * Goal analysis for citations
 */
export interface GoalAnalysis {
  /** Identified user goals */
  identifiedGoals: UserGoal[];
  
  /** Goal alignment with citation */
  goalAlignment: GoalAlignment;
  
  /** Goal achievement probability */
  achievementProbability: number;
}

/**
 * User goals for citations
 */
export interface UserGoal {
  /** Goal description */
  description: string;
  
  /** Goal type */
  type: GoalType;
  
  /** Goal priority */
  priority: number;
  
  /** How citation serves this goal */
  citationRole: string;
}

/**
 * Goal types
 */
export type GoalType = 
  | 'persuade-audience'
  | 'demonstrate-expertise'
  | 'build-argument'
  | 'provide-evidence'
  | 'establish-context'
  | 'show-knowledge-gap'
  | 'support-methodology'
  | 'validate-findings'
  | 'academic-requirement'
  | 'intellectual-honesty';

/**
 * Goal alignment assessment
 */
export interface GoalAlignment {
  /** Overall alignment score */
  overallScore: number;
  
  /** Individual goal alignments */
  individualAlignments: IndividualGoalAlignment[];
  
  /** Misalignment risks */
  misalignmentRisks: MisalignmentRisk[];
}

/**
 * Individual goal alignment
 */
export interface IndividualGoalAlignment {
  /** Goal ID */
  goalId: string;
  
  /** Alignment score */
  alignmentScore: number;
  
  /** How citation supports goal */
  supportMechanism: string;
  
  /** Potential improvements */
  improvements: string[];
}

/**
 * Misalignment risk
 */
export interface MisalignmentRisk {
  /** Risk description */
  description: string;
  
  /** Risk level */
  level: 'low' | 'medium' | 'high' | 'critical';
  
  /** Mitigation strategies */
  mitigationStrategies: string[];
}

/**
 * Counterfactual analysis results
 */
export interface CounterfactualAnalysisResult {
  /** Counterfactual scenarios tested */
  scenarios: CounterfactualScenario[];
  
  /** Robustness assessment */
  robustnessAssessment: RobustnessAssessment;
  
  /** Alternative interpretation risks */
  alternativeRisks: AlternativeInterpretationRisk[];
}

/**
 * Counterfactual scenario
 */
export interface CounterfactualScenario {
  /** Scenario ID */
  id: string;
  
  /** Scenario description */
  description: string;
  
  /** Scenario type */
  type: CounterfactualType;
  
  /** Citation appropriateness in scenario */
  appropriate: boolean;
  
  /** Confidence in assessment */
  confidence: number;
  
  /** Reasoning */
  reasoning: string;
}

/**
 * Counterfactual scenario types
 */
export type CounterfactualType = 
  | 'temporal-ambiguity'
  | 'domain-context-shift'
  | 'cultural-context-shift'
  | 'implicit-knowledge-variation'
  | 'negation-interpretation'
  | 'scope-ambiguity'
  | 'causal-interpretation'
  | 'methodological-assumption';

/**
 * Robustness assessment
 */
export interface RobustnessAssessment {
  /** Overall robustness score */
  overallScore: number;
  
  /** Vulnerability areas */
  vulnerabilities: RobustnessVulnerability[];
  
  /** Strengths identified */
  strengths: RobustnessStrength[];
}

/**
 * Robustness vulnerability
 */
export interface RobustnessVulnerability {
  /** Vulnerability description */
  description: string;
  
  /** Impact level */
  impact: 'low' | 'medium' | 'high';
  
  /** Likelihood of occurrence */
  likelihood: number;
  
  /** Mitigation approaches */
  mitigation: string[];
}

/**
 * Intent interpretation
 */
export interface IntentInterpretation {
  /** Interpretation description */
  description: string;
  
  /** Probability of this interpretation */
  probability: number;
  
  /** Supporting evidence */
  evidence: string[];
  
  /** Citation appropriateness under interpretation */
  citationAppropriateness: number;
}

// ========== Boundary Validation ==========

/**
 * Boundary validation result implementing solution space constraints
 */
export interface BoundaryValidationResult extends BaseValidationResult {
  /** Solution space constraints satisfied */
  constraintsSatisfied: boolean;
  
  /** Boundary constraint analysis */
  constraintAnalysis: BoundaryConstraintAnalysis;
  
  /** Ridiculous alternative analysis (Pugachev Cobra mechanism) */
  ridiculousAlternativeAnalysis: RidiculousAlternativeAnalysis;
  
  /** Solution space mapping */
  solutionSpaceMapping: SolutionSpaceMapping;
  
  /** Boundary violation warnings */
  boundaryViolations: BoundaryViolation[];
}

/**
 * Boundary constraint analysis
 */
export interface BoundaryConstraintAnalysis {
  /** Domain constraints */
  domainConstraints: DomainConstraint[];
  
  /** Style constraints */
  styleConstraints: StyleConstraint[];
  
  /** Quality constraints */
  qualityConstraints: QualityConstraint[];
  
  /** Feasibility constraints */
  feasibilityConstraints: FeasibilityConstraint[];
}

/**
 * Domain constraint
 */
export interface DomainConstraint {
  /** Constraint type */
  type: 'academic-domain' | 'publication-type' | 'methodology' | 'theoretical-framework';
  
  /** Constraint description */
  description: string;
  
  /** Is constraint satisfied */
  satisfied: boolean;
  
  /** Constraint strictness */
  strictness: 'required' | 'preferred' | 'optional';
  
  /** Violation consequences */
  violationConsequences: string[];
}

/**
 * Ridiculous alternative analysis (from boundary validation)
 */
export interface RidiculousAlternativeAnalysis {
  /** Ridiculous alternatives generated */
  alternatives: RidiculousAlternative[];
  
  /** Boundary identification effectiveness */
  boundaryIdentificationEffectiveness: number;
  
  /** Solution space clarification */
  solutionSpaceClarification: SolutionSpaceClarification;
}

/**
 * Ridiculous alternative
 */
export interface RidiculousAlternative {
  /** Alternative description */
  description: string;
  
  /** Ridiculousness score */
  ridiculousnessScore: number;
  
  /** Why it's ridiculous */
  ridiculousnessReason: string;
  
  /** What boundaries it violates */
  boundariesViolated: string[];
  
  /** Learning value */
  learningValue: string;
}

/**
 * Solution space mapping
 */
export interface SolutionSpaceMapping {
  /** Valid solution regions */
  validRegions: SolutionRegion[];
  
  /** Invalid solution regions */
  invalidRegions: SolutionRegion[];
  
  /** Boundary definitions */
  boundaries: SolutionBoundary[];
  
  /** Optimal solutions */
  optimalSolutions: OptimalSolution[];
}

/**
 * Solution region
 */
export interface SolutionRegion {
  /** Region ID */
  id: string;
  
  /** Region description */
  description: string;
  
  /** Region characteristics */
  characteristics: string[];
  
  /** Quality assessment */
  quality: number;
  
  /** Examples in region */
  examples: string[];
}

// ========== Systematic Bias Validation ==========

/**
 * Systematic bias validation result implementing finite observer constraints
 */
export interface SystematicBiasValidationResult extends BaseValidationResult {
  /** Bias assessment results */
  biasAssessment: BiasAssessment;
  
  /** Task decomposition analysis */
  taskDecompositionAnalysis: TaskDecompositionAnalysis;
  
  /** Importance weighting results */
  importanceWeighting: ImportanceWeightingResult;
  
  /** Processing efficiency metrics */
  processingEfficiency: ProcessingEfficiencyMetrics;
  
  /** Termination criteria analysis */
  terminationCriteriaAnalysis: TerminationCriteriaAnalysis;
}

/**
 * Bias assessment
 */
export interface BiasAssessment {
  /** Identified biases */
  identifiedBiases: IdentifiedBias[];
  
  /** Bias impact assessment */
  biasImpactAssessment: BiasImpactAssessment;
  
  /** Bias mitigation strategies */
  mitigationStrategies: BiasMitigationStrategy[];
  
  /** Systematic bias necessity validation */
  systematicBiasNecessity: SystematicBiasNecessity;
}

/**
 * Identified bias
 */
export interface IdentifiedBias {
  /** Bias type */
  type: BiasType;
  
  /** Bias description */
  description: string;
  
  /** Bias strength */
  strength: number;
  
  /** Bias source */
  source: BiasSource;
  
  /** Impact on validation */
  validationImpact: BiasImpact;
}

/**
 * Bias types
 */
export type BiasType = 
  | 'domain-preference'
  | 'recency-bias'
  | 'authority-bias'
  | 'confirmation-bias'
  | 'availability-heuristic'
  | 'anchoring-bias'
  | 'cultural-bias'
  | 'language-bias'
  | 'publication-bias'
  | 'selection-bias';

/**
 * Bias sources
 */
export type BiasSource = 
  | 'training-data'
  | 'model-architecture'
  | 'user-preferences'
  | 'domain-conventions'
  | 'historical-patterns'
  | 'cultural-context'
  | 'linguistic-patterns'
  | 'selection-algorithms';

/**
 * Bias impact assessment
 */
export interface BiasImpactAssessment {
  /** Overall bias impact score */
  overallImpact: number;
  
  /** Individual bias impacts */
  individualImpacts: IndividualBiasImpact[];
  
  /** Cumulative bias effects */
  cumulativeEffects: CumulativeBiasEffect[];
}

/**
 * Individual bias impact
 */
export interface IndividualBiasImpact {
  /** Bias ID */
  biasId: string;
  
  /** Impact magnitude */
  magnitude: number;
  
  /** Impact direction */
  direction: 'positive' | 'negative' | 'neutral';
  
  /** Affected validation aspects */
  affectedAspects: string[];
}

/**
 * Task decomposition analysis
 */
export interface TaskDecompositionAnalysis {
  /** Decomposed tasks */
  decomposedTasks: ValidationTask[];
  
  /** Task importance scores */
  taskImportance: TaskImportance[];
  
  /** Task completion status */
  completionStatus: TaskCompletionStatus;
  
  /** Resource allocation efficiency */
  resourceAllocationEfficiency: number;
}

/**
 * Validation task
 */
export interface ValidationTask {
  /** Task ID */
  id: string;
  
  /** Task description */
  description: string;
  
  /** Task type */
  type: ValidationTaskType;
  
  /** Required resources */
  requiredResources: TaskResource[];
  
  /** Expected completion time */
  expectedCompletionTime: number;
  
  /** Task dependencies */
  dependencies: string[];
}

/**
 * Validation task types
 */
export type ValidationTaskType = 
  | 'citation-parsing'
  | 'intent-analysis'
  | 'quality-assessment'
  | 'domain-classification'
  | 'credibility-evaluation'
  | 'format-validation'
  | 'context-analysis'
  | 'recommendation-generation';

/**
 * Task resource
 */
export interface TaskResource {
  /** Resource type */
  type: 'model' | 'data' | 'computation' | 'time' | 'human-expertise';
  
  /** Resource amount needed */
  amount: number;
  
  /** Resource unit */
  unit: string;
  
  /** Resource availability */
  availability: number;
}

/**
 * Importance weighting result
 */
export interface ImportanceWeightingResult {
  /** Weighted task priorities */
  taskPriorities: TaskPriority[];
  
  /** Selection criteria effectiveness */
  selectionCriteriaEffectiveness: number;
  
  /** Coverage analysis */
  coverageAnalysis: CoverageAnalysis;
  
  /** Efficiency metrics */
  efficiencyMetrics: EfficiencyMetrics;
}

/**
 * Task priority
 */
export interface TaskPriority {
  /** Task ID */
  taskId: string;
  
  /** Priority score */
  priorityScore: number;
  
  /** Priority rationale */
  rationale: string;
  
  /** Impact if skipped */
  skipImpact: number;
}

/**
 * Coverage analysis
 */
export interface CoverageAnalysis {
  /** Total coverage achieved */
  totalCoverage: number;
  
  /** Critical area coverage */
  criticalAreaCoverage: number;
  
  /** Uncovered areas */
  uncoveredAreas: UncoveredArea[];
  
  /** Coverage quality */
  coverageQuality: number;
}

/**
 * Uncovered area
 */
export interface UncoveredArea {
  /** Area description */
  description: string;
  
  /** Importance level */
  importance: number;
  
  /** Risk of not covering */
  risk: number;
  
  /** Potential mitigation */
  mitigation: string[];
}

// ========== Validation Configuration and Settings ==========

/**
 * Validation configuration
 */
export interface ValidationConfiguration {
  /** Intent validation settings */
  intentValidation: IntentValidationConfig;
  
  /** Boundary validation settings */
  boundaryValidation: BoundaryValidationConfig;
  
  /** Systematic bias validation settings */
  systematicBiasValidation: SystematicBiasValidationConfig;
  
  /** General validation settings */
  general: GeneralValidationConfig;
  
  /** Quality thresholds */
  qualityThresholds: ValidationQualityThresholds;
}

/**
 * Intent validation configuration
 */
export interface IntentValidationConfig {
  /** Enable intent validation */
  enabled: boolean;
  
  /** Interrogation depth */
  interrogationDepth: number;
  
  /** Counterfactual scenario count */
  counterfactualScenarioCount: number;
  
  /** Intent confidence threshold */
  intentConfidenceThreshold: number;
  
  /** Alternative interpretation limit */
  alternativeInterpretationLimit: number;
}

/**
 * Boundary validation configuration
 */
export interface BoundaryValidationConfig {
  /** Enable boundary validation */
  enabled: boolean;
  
  /** Ridiculous alternative count */
  ridiculousAlternativeCount: number;
  
  /** Boundary strictness */
  boundaryStrictness: 'strict' | 'moderate' | 'relaxed';
  
  /** Solution space exploration depth */
  solutionSpaceExplorationDepth: number;
}

/**
 * Systematic bias validation configuration
 */
export interface SystematicBiasValidationConfig {
  /** Enable systematic bias validation */
  enabled: boolean;
  
  /** Task decomposition depth */
  taskDecompositionDepth: number;
  
  /** Importance weighting strategy */
  importanceWeightingStrategy: 'performance-based' | 'domain-based' | 'user-preference' | 'adaptive';
  
  /** Processing time limit */
  processingTimeLimit: number;
  
  /** Resource allocation strategy */
  resourceAllocationStrategy: 'optimal' | 'balanced' | 'conservative';
}

/**
 * General validation configuration
 */
export interface GeneralValidationConfig {
  /** Validation timeout (ms) */
  timeoutMs: number;
  
  /** Concurrent validation limit */
  concurrentValidationLimit: number;
  
  /** Cache validation results */
  cacheResults: boolean;
  
  /** Cache duration (ms) */
  cacheDurationMs: number;
  
  /** Enable validation logging */
  enableLogging: boolean;
}

/**
 * Validation quality thresholds
 */
export interface ValidationQualityThresholds {
  /** Minimum passing score */
  minimumPassingScore: number;
  
  /** Warning threshold */
  warningThreshold: number;
  
  /** Excellent threshold */
  excellentThreshold: number;
  
  /** Confidence thresholds */
  confidenceThresholds: ConfidenceThresholds;
}

/**
 * Confidence thresholds
 */
export interface ConfidenceThresholds {
  /** Low confidence threshold */
  low: number;
  
  /** Medium confidence threshold */
  medium: number;
  
  /** High confidence threshold */
  high: number;
  
  /** Very high confidence threshold */
  veryHigh: number;
}

// ========== Supporting Types ==========

/**
 * Validation issue
 */
export interface ValidationIssue {
  /** Issue ID */
  id: string;
  
  /** Issue type */
  type: ValidationIssueType;
  
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Issue description */
  description: string;
  
  /** Affected validation aspect */
  affectedAspect: string;
  
  /** Recommended action */
  recommendedAction: string;
  
  /** Auto-fixable */
  autoFixable: boolean;
}

/**
 * Validation issue types
 */
export type ValidationIssueType = 
  | 'intent-mismatch'
  | 'boundary-violation'
  | 'bias-concern'
  | 'quality-below-threshold'
  | 'processing-timeout'
  | 'insufficient-confidence'
  | 'data-quality-issue'
  | 'model-error'
  | 'configuration-error';

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  /** Validation timestamp */
  timestamp: Date;
  
  /** Validation version */
  version: string;
  
  /** Models used */
  modelsUsed: ModelConfig[];
  
  /** Configuration used */
  configurationUsed: ValidationConfiguration;
  
  /** Processing duration */
  processingDuration: number;
  
  /** Resource usage */
  resourceUsage: ValidationResourceUsage;
}

/**
 * Validation resource usage
 */
export interface ValidationResourceUsage {
  /** CPU time used (ms) */
  cpuTimeMs: number;
  
  /** Memory used (MB) */
  memoryMB: number;
  
  /** API calls made */
  apiCalls: number;
  
  /** Token usage */
  tokenUsage: number;
  
  /** Cost incurred */
  cost: number;
}

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
  /** Recommendation ID */
  id: string;
  
  /** Recommendation type */
  type: ValidationRecommendationType;
  
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  /** Recommendation description */
  description: string;
  
  /** Expected impact */
  expectedImpact: string;
  
  /** Implementation difficulty */
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  
  /** Auto-implementation available */
  autoImplementationAvailable: boolean;
}

/**
 * Validation recommendation types
 */
export type ValidationRecommendationType = 
  | 'improve-intent-clarity'
  | 'adjust-boundary-constraints'
  | 'address-bias-concerns'
  | 'enhance-citation-quality'
  | 'optimize-processing-efficiency'
  | 'increase-validation-confidence'
  | 'improve-task-prioritization'
  | 'update-configuration';

// ========== Export Collections ==========

/**
 * All validation-related types for easy importing
 */
export type {
  // Core validation types
  TripleValidationResult,
  BaseValidationResult,
  ValidationIssue,
  ValidationMetadata,
  ValidationRecommendation,
  
  // Intent validation types
  IntentValidationResult,
  InterrogativeAnalysisResult,
  CounterfactualAnalysisResult,
  MotivationalAnalysis,
  GoalAnalysis,
  UserGoal,
  GoalAlignment,
  IntentInterpretation,
  
  // Boundary validation types
  BoundaryValidationResult,
  BoundaryConstraintAnalysis,
  RidiculousAlternativeAnalysis,
  SolutionSpaceMapping,
  RidiculousAlternative,
  SolutionRegion,
  
  // Systematic bias validation types
  SystematicBiasValidationResult,
  BiasAssessment,
  TaskDecompositionAnalysis,
  ImportanceWeightingResult,
  IdentifiedBias,
  ValidationTask,
  TaskPriority,
  CoverageAnalysis,
  
  // Configuration types
  ValidationConfiguration,
  IntentValidationConfig,
  BoundaryValidationConfig,
  SystematicBiasValidationConfig,
  GeneralValidationConfig,
  ValidationQualityThresholds
};

/**
 * All validation enums for easy importing
 */
export type {
  ValidationStatus,
  CitationMotivation,
  GoalType,
  CounterfactualType,
  BiasType,
  BiasSource,
  ValidationTaskType,
  ValidationIssueType,
  ValidationRecommendationType
};
