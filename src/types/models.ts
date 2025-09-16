/**
 * AI Model types for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * These types define the model interfaces, configurations, and orchestration
 * structures for integrating multiple AI frameworks and specialized models.
 */

import type { AcademicDomain, CitationContext, Citation, QualityAssessment } from './citations.js';

// ========== Model Providers and Configuration ==========

/**
 * Supported AI model providers
 */
export type ModelProvider = 
  | 'huggingface'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'cohere'
  | 'local'
  | 'custom';

/**
 * Model deployment types
 */
export type ModelDeployment = 
  | 'cloud-api'
  | 'local-inference'
  | 'edge-device'
  | 'hybrid';

/**
 * Model specialization categories
 */
export type ModelSpecialization = 
  | 'citation-analysis'
  | 'domain-classification'
  | 'intent-inference'
  | 'quality-assessment'
  | 'text-generation'
  | 'embedding'
  | 'classification'
  | 'question-answering'
  | 'summarization'
  | 'translation'
  | 'reasoning'
  | 'validation'
  | 'general-purpose';

/**
 * Base model configuration interface
 */
export interface ModelConfig {
  /** Model identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Model provider */
  provider: ModelProvider;
  
  /** Deployment type */
  deployment: ModelDeployment;
  
  /** Model specialization */
  specialization: ModelSpecialization[];
  
  /** Academic domains this model supports */
  supportedDomains: AcademicDomain[];
  
  /** Model capabilities */
  capabilities: ModelCapabilities;
  
  /** Configuration parameters */
  parameters: ModelParameters;
  
  /** Resource requirements */
  resources: ResourceRequirements;
  
  /** Model metadata */
  metadata: ModelMetadata;
}

/**
 * Model capabilities specification
 */
export interface ModelCapabilities {
  /** Maximum input tokens */
  maxInputTokens: number;
  
  /** Maximum output tokens */
  maxOutputTokens: number;
  
  /** Supports batch processing */
  batchProcessing: boolean;
  
  /** Supports streaming */
  streaming: boolean;
  
  /** Supports embeddings */
  embeddings: boolean;
  
  /** Supports fine-tuning */
  fineTuning: boolean;
  
  /** Supported languages */
  languages: string[];
  
  /** Response time characteristics */
  latency: LatencyProfile;
  
  /** Cost characteristics */
  cost: CostProfile;
}

/**
 * Latency profile for model responses
 */
export interface LatencyProfile {
  /** Average response time (ms) */
  averageMs: number;
  
  /** 95th percentile response time (ms) */
  p95Ms: number;
  
  /** Time to first token (ms) */
  timeToFirstToken?: number;
  
  /** Tokens per second */
  tokensPerSecond?: number;
}

/**
 * Cost profile for model usage
 */
export interface CostProfile {
  /** Cost per input token */
  inputTokenCost: number;
  
  /** Cost per output token */
  outputTokenCost: number;
  
  /** Fixed cost per request */
  requestCost?: number;
  
  /** Currency */
  currency: string;
  
  /** Cost tier */
  tier: 'free' | 'low' | 'medium' | 'high' | 'premium';
}

/**
 * Model parameters and configuration
 */
export interface ModelParameters {
  /** Temperature for randomness */
  temperature?: number;
  
  /** Top-p nucleus sampling */
  topP?: number;
  
  /** Top-k sampling */
  topK?: number;
  
  /** Frequency penalty */
  frequencyPenalty?: number;
  
  /** Presence penalty */
  presencePenalty?: number;
  
  /** Custom parameters */
  custom?: Record<string, unknown>;
}

/**
 * Resource requirements for model execution
 */
export interface ResourceRequirements {
  /** Memory requirements (MB) */
  memoryMB: number;
  
  /** CPU requirements (cores) */
  cpuCores?: number;
  
  /** GPU requirements */
  gpu?: GPURequirements;
  
  /** Storage requirements (MB) */
  storageMB: number;
  
  /** Network bandwidth requirements (Mbps) */
  networkMbps?: number;
}

/**
 * GPU requirements specification
 */
export interface GPURequirements {
  /** Required GPU memory (MB) */
  memoryMB: number;
  
  /** Required CUDA compute capability */
  cudaCapability?: string;
  
  /** Preferred GPU types */
  preferredTypes?: string[];
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  /** Model version */
  version: string;
  
  /** Training data cutoff */
  trainingCutoff?: Date;
  
  /** Model size (parameters) */
  parameterCount?: number;
  
  /** License information */
  license: string;
  
  /** Model description */
  description: string;
  
  /** Model limitations */
  limitations: string[];
  
  /** Evaluation metrics */
  evaluationMetrics?: EvaluationMetrics;
}

/**
 * Model evaluation metrics
 */
export interface EvaluationMetrics {
  /** Accuracy metrics */
  accuracy?: number;
  
  /** F1 scores */
  f1Score?: number;
  
  /** BLEU scores (for generation) */
  bleuScore?: number;
  
  /** Perplexity (for language models) */
  perplexity?: number;
  
  /** Domain-specific metrics */
  domainMetrics?: Record<AcademicDomain, number>;
  
  /** Custom evaluation metrics */
  custom?: Record<string, number>;
}

// ========== Specialized Model Configurations ==========

/**
 * HuggingFace model configuration
 */
export interface HuggingFaceModelConfig extends ModelConfig {
  provider: 'huggingface';
  
  /** Model repository path */
  repositoryId: string;
  
  /** Task type on HuggingFace */
  task: HuggingFaceTask;
  
  /** Pipeline configuration */
  pipelineConfig?: Record<string, unknown>;
  
  /** Tokenizer configuration */
  tokenizerConfig?: TokenizerConfig;
  
  /** Model loading options */
  loadingOptions?: HuggingFaceLoadingOptions;
}

/**
 * HuggingFace supported tasks
 */
export type HuggingFaceTask = 
  | 'text-classification'
  | 'text-generation' 
  | 'question-answering'
  | 'summarization'
  | 'translation'
  | 'text2text-generation'
  | 'feature-extraction'
  | 'sentence-similarity'
  | 'token-classification'
  | 'fill-mask'
  | 'zero-shot-classification'
  | 'conversational';

/**
 * Tokenizer configuration
 */
export interface TokenizerConfig {
  /** Tokenizer type */
  type: string;
  
  /** Maximum sequence length */
  maxLength: number;
  
  /** Padding configuration */
  padding: boolean | 'max_length';
  
  /** Truncation configuration */
  truncation: boolean;
  
  /** Add special tokens */
  addSpecialTokens: boolean;
}

/**
 * HuggingFace model loading options
 */
export interface HuggingFaceLoadingOptions {
  /** Use auth token */
  useAuthToken?: boolean;
  
  /** Revision/branch to use */
  revision?: string;
  
  /** Trust remote code */
  trustRemoteCode?: boolean;
  
  /** Cache directory */
  cacheDir?: string;
  
  /** Force download */
  forceDownload?: boolean;
}

/**
 * Commercial LLM configuration (OpenAI, Anthropic, etc.)
 */
export interface CommercialLLMConfig extends ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'cohere';
  
  /** API endpoint */
  endpoint: string;
  
  /** Model name/identifier used by the provider */
  modelName: string;
  
  /** API version */
  apiVersion?: string;
  
  /** Rate limiting configuration */
  rateLimits: RateLimits;
  
  /** Retry configuration */
  retryConfig: RetryConfig;
}

/**
 * Rate limiting configuration
 */
export interface RateLimits {
  /** Requests per minute */
  requestsPerMinute: number;
  
  /** Tokens per minute */
  tokensPerMinute: number;
  
  /** Concurrent requests */
  concurrentRequests: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  
  /** Base delay between retries (ms) */
  baseDelay: number;
  
  /** Exponential backoff factor */
  backoffFactor: number;
  
  /** Maximum delay (ms) */
  maxDelay: number;
  
  /** Jitter factor */
  jitter: boolean;
}

// ========== Model Orchestration and Multi-Expert Systems ==========

/**
 * Multi-expert orchestration configuration
 */
export interface ExpertOrchestrationConfig {
  /** Orchestration strategy */
  strategy: OrchestrationStrategy;
  
  /** Expert model configurations */
  experts: ExpertModelConfig[];
  
  /** Consensus mechanism */
  consensus: ConsensusConfig;
  
  /** Routing configuration */
  routing: RoutingConfig;
  
  /** Performance monitoring */
  monitoring: MonitoringConfig;
}

/**
 * Orchestration strategies
 */
export type OrchestrationStrategy = 
  | 'router-based-ensemble'
  | 'sequential-chaining'
  | 'mixture-of-experts'
  | 'hierarchical-routing'
  | 'parallel-consensus'
  | 'adaptive-selection';

/**
 * Expert model configuration
 */
export interface ExpertModelConfig extends ModelConfig {
  /** Expertise weight */
  expertiseWeight: number;
  
  /** Confidence threshold */
  confidenceThreshold: number;
  
  /** Specialized domains */
  expertiseDomains: AcademicDomain[];
  
  /** Task specializations */
  taskSpecializations: string[];
  
  /** Performance metrics */
  performanceMetrics: ExpertPerformanceMetrics;
}

/**
 * Expert performance metrics
 */
export interface ExpertPerformanceMetrics {
  /** Historical accuracy */
  accuracy: number;
  
  /** Response quality */
  qualityScore: number;
  
  /** Consistency rating */
  consistency: number;
  
  /** Domain expertise scores */
  domainExpertise: Record<AcademicDomain, number>;
  
  /** Task performance scores */
  taskPerformance: Record<string, number>;
}

/**
 * Consensus mechanism configuration
 */
export interface ConsensusConfig {
  /** Consensus method */
  method: ConsensusMethod;
  
  /** Minimum agreement threshold */
  agreementThreshold: number;
  
  /** Voting weights */
  votingWeights: VotingWeights;
  
  /** Conflict resolution strategy */
  conflictResolution: ConflictResolutionStrategy;
}

/**
 * Consensus methods
 */
export type ConsensusMethod = 
  | 'majority-vote'
  | 'weighted-average'
  | 'expert-ranking'
  | 'confidence-weighted'
  | 'bayesian-averaging'
  | 'ensemble-stacking';

/**
 * Voting weight configuration
 */
export interface VotingWeights {
  /** Weight by expertise */
  expertise: number;
  
  /** Weight by confidence */
  confidence: number;
  
  /** Weight by historical performance */
  performance: number;
  
  /** Weight by domain relevance */
  domainRelevance: number;
}

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy = 
  | 'defer-to-highest-confidence'
  | 'defer-to-domain-expert'
  | 'request-human-intervention'
  | 'use-fallback-model'
  | 'aggregate-responses'
  | 'escalate-to-commercial-llm';

/**
 * Routing configuration
 */
export interface RoutingConfig {
  /** Routing algorithm */
  algorithm: RoutingAlgorithm;
  
  /** Route selection criteria */
  selectionCriteria: RouteSelectionCriteria;
  
  /** Fallback routing */
  fallbackRouting: FallbackRouting;
  
  /** Load balancing */
  loadBalancing: LoadBalancingConfig;
}

/**
 * Routing algorithms
 */
export type RoutingAlgorithm = 
  | 'domain-based'
  | 'task-based'
  | 'performance-based'
  | 'cost-based'
  | 'latency-based'
  | 'round-robin'
  | 'random'
  | 'adaptive-learning';

/**
 * Route selection criteria
 */
export interface RouteSelectionCriteria {
  /** Domain match weight */
  domainMatch: number;
  
  /** Task specialization weight */
  taskSpecialization: number;
  
  /** Performance weight */
  performance: number;
  
  /** Cost weight */
  cost: number;
  
  /** Latency weight */
  latency: number;
  
  /** Availability weight */
  availability: number;
}

/**
 * Fallback routing configuration
 */
export interface FallbackRouting {
  /** Enable fallback routing */
  enabled: boolean;
  
  /** Fallback model priority */
  fallbackPriority: string[];
  
  /** Failure threshold */
  failureThreshold: number;
  
  /** Recovery strategy */
  recoveryStrategy: 'immediate' | 'gradual' | 'manual';
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  /** Load balancing strategy */
  strategy: 'round-robin' | 'least-loaded' | 'performance-based' | 'cost-optimized';
  
  /** Health check configuration */
  healthCheck: HealthCheckConfig;
  
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Check interval (ms) */
  intervalMs: number;
  
  /** Timeout (ms) */
  timeoutMs: number;
  
  /** Failure threshold */
  failureThreshold: number;
  
  /** Recovery threshold */
  recoveryThreshold: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold */
  failureThreshold: number;
  
  /** Reset timeout (ms) */
  resetTimeoutMs: number;
  
  /** Half-open max calls */
  halfOpenMaxCalls: number;
}

// ========== Model Execution and Response Types ==========

/**
 * Model request interface
 */
export interface ModelRequest {
  /** Request ID */
  id: string;
  
  /** Input text/data */
  input: string | Record<string, unknown>;
  
  /** Task type */
  task: string;
  
  /** Request parameters */
  parameters?: ModelParameters;
  
  /** Context information */
  context?: ModelRequestContext;
  
  /** Request metadata */
  metadata: RequestMetadata;
}

/**
 * Model request context
 */
export interface ModelRequestContext {
  /** Citation context if applicable */
  citation?: CitationContext;
  
  /** Document context */
  document?: DocumentContext;
  
  /** User context */
  user?: UserContext;
  
  /** Session context */
  session?: SessionContext;
}

/**
 * Document context for model requests
 */
export interface DocumentContext {
  /** Document type */
  type: string;
  
  /** Academic domain */
  domain: AcademicDomain;
  
  /** Document language */
  language: string;
  
  /** Document metadata */
  metadata: Record<string, unknown>;
}

/**
 * User context for personalization
 */
export interface UserContext {
  /** User preferences */
  preferences: UserPreferences;
  
  /** Usage history */
  history: UsageHistory;
  
  /** Expertise level */
  expertiseLevel: 'novice' | 'intermediate' | 'advanced' | 'expert';
}

/**
 * User preferences
 */
export interface UserPreferences {
  /** Preferred citation style */
  citationStyle: string;
  
  /** Quality thresholds */
  qualityThresholds: QualityThresholds;
  
  /** Notification preferences */
  notifications: NotificationPreferences;
  
  /** Interface preferences */
  interface: InterfacePreferences;
}

/**
 * Quality thresholds
 */
export interface QualityThresholds {
  /** Minimum acceptable quality */
  minimum: number;
  
  /** Warning threshold */
  warning: number;
  
  /** Excellent threshold */
  excellent: number;
}

/**
 * Model response interface
 */
export interface ModelResponse<T = unknown> {
  /** Response ID */
  id: string;
  
  /** Request ID this responds to */
  requestId: string;
  
  /** Response data */
  data: T;
  
  /** Response metadata */
  metadata: ResponseMetadata;
  
  /** Performance metrics */
  performance: PerformanceMetrics;
  
  /** Quality assessment */
  quality?: QualityAssessment;
  
  /** Error information if applicable */
  error?: ModelError;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /** Model used */
  model: string;
  
  /** Processing timestamp */
  timestamp: Date;
  
  /** Processing duration (ms) */
  durationMs: number;
  
  /** Token usage */
  tokenUsage?: TokenUsage;
  
  /** Confidence score */
  confidence: number;
  
  /** Alternative responses */
  alternatives?: AlternativeResponse[];
}

/**
 * Token usage information
 */
export interface TokenUsage {
  /** Input tokens */
  inputTokens: number;
  
  /** Output tokens */
  outputTokens: number;
  
  /** Total tokens */
  totalTokens: number;
  
  /** Cost information */
  cost?: CostInformation;
}

/**
 * Cost information
 */
export interface CostInformation {
  /** Input cost */
  inputCost: number;
  
  /** Output cost */
  outputCost: number;
  
  /** Total cost */
  totalCost: number;
  
  /** Currency */
  currency: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Latency (ms) */
  latencyMs: number;
  
  /** Throughput (tokens/second) */
  throughput?: number;
  
  /** Memory usage (MB) */
  memoryUsageMB?: number;
  
  /** CPU usage (%) */
  cpuUsagePercent?: number;
  
  /** GPU usage (%) */
  gpuUsagePercent?: number;
}

/**
 * Alternative response
 */
export interface AlternativeResponse {
  /** Response data */
  data: unknown;
  
  /** Confidence score */
  confidence: number;
  
  /** Reasoning/explanation */
  reasoning?: string;
}

/**
 * Model error information
 */
export interface ModelError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error type */
  type: ModelErrorType;
  
  /** Retry information */
  retryable: boolean;
  
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Model error types
 */
export type ModelErrorType = 
  | 'authentication'
  | 'authorization'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'validation'
  | 'processing'
  | 'resource-exhausted'
  | 'model-unavailable'
  | 'internal-error';

// ========== Model Registry and Management ==========

/**
 * Model registry interface
 */
export interface ModelRegistry {
  /** Available models */
  models: Map<string, ModelConfig>;
  
  /** Domain-specific models */
  domainModels: Map<AcademicDomain, ModelConfig[]>;
  
  /** Task-specific models */
  taskModels: Map<string, ModelConfig[]>;
  
  /** Model performance data */
  performanceData: Map<string, ModelPerformanceData>;
  
  /** Model availability status */
  availability: Map<string, ModelAvailability>;
}

/**
 * Model performance data
 */
export interface ModelPerformanceData {
  /** Historical metrics */
  historical: HistoricalMetrics;
  
  /** Recent performance */
  recent: RecentPerformance;
  
  /** Benchmark results */
  benchmarks: BenchmarkResults;
  
  /** User ratings */
  userRatings: UserRatings;
}

/**
 * Historical metrics
 */
export interface HistoricalMetrics {
  /** Average latency over time */
  avgLatency: TimeSeriesData;
  
  /** Success rate over time */
  successRate: TimeSeriesData;
  
  /** Quality scores over time */
  qualityScores: TimeSeriesData;
  
  /** Cost trends over time */
  costTrends: TimeSeriesData;
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  /** Data points */
  points: TimeSeriesPoint[];
  
  /** Time range */
  timeRange: TimeRange;
}

/**
 * Time series point
 */
export interface TimeSeriesPoint {
  /** Timestamp */
  timestamp: Date;
  
  /** Value */
  value: number;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Time range specification
 */
export interface TimeRange {
  /** Start time */
  start: Date;
  
  /** End time */
  end: Date;
  
  /** Granularity */
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

/**
 * Model availability status
 */
export interface ModelAvailability {
  /** Is model currently available */
  available: boolean;
  
  /** Health status */
  health: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Last health check */
  lastHealthCheck: Date;
  
  /** Planned maintenance */
  plannedMaintenance?: MaintenanceWindow[];
  
  /** Current issues */
  issues?: ModelIssue[];
}

/**
 * Maintenance window
 */
export interface MaintenanceWindow {
  /** Start time */
  start: Date;
  
  /** End time */
  end: Date;
  
  /** Description */
  description: string;
  
  /** Impact level */
  impact: 'low' | 'medium' | 'high';
}

/**
 * Model issue
 */
export interface ModelIssue {
  /** Issue ID */
  id: string;
  
  /** Issue description */
  description: string;
  
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Start time */
  startTime: Date;
  
  /** Estimated resolution time */
  estimatedResolution?: Date;
  
  /** Status */
  status: 'investigating' | 'identified' | 'fixing' | 'monitoring' | 'resolved';
}

// ========== Export Collections ==========

/**
 * All model-related types for easy importing
 */
export type {
  // Core configuration types
  ModelConfig,
  ModelCapabilities,
  LatencyProfile,
  CostProfile,
  ModelParameters,
  ResourceRequirements,
  GPURequirements,
  ModelMetadata,
  EvaluationMetrics,
  
  // Specialized configurations
  HuggingFaceModelConfig,
  TokenizerConfig,
  HuggingFaceLoadingOptions,
  CommercialLLMConfig,
  RateLimits,
  RetryConfig,
  
  // Orchestration types
  ExpertOrchestrationConfig,
  ExpertModelConfig,
  ExpertPerformanceMetrics,
  ConsensusConfig,
  RoutingConfig,
  LoadBalancingConfig,
  
  // Request/Response types
  ModelRequest,
  ModelRequestContext,
  DocumentContext,
  UserContext,
  UserPreferences,
  ModelResponse,
  ResponseMetadata,
  TokenUsage,
  CostInformation,
  PerformanceMetrics,
  ModelError,
  
  // Registry types
  ModelRegistry,
  ModelPerformanceData,
  HistoricalMetrics,
  TimeSeriesData,
  ModelAvailability,
  MaintenanceWindow,
  ModelIssue
};

/**
 * All model enums for easy importing
 */
export type {
  ModelProvider,
  ModelDeployment,
  ModelSpecialization,
  HuggingFaceTask,
  OrchestrationStrategy,
  ConsensusMethod,
  ConflictResolutionStrategy,
  RoutingAlgorithm,
  ModelErrorType
};
