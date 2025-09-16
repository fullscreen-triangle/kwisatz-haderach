/**
 * Environmental Intelligence types for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * These types implement the 12-dimensional environmental processing from the
 * Ephemeral Intelligence framework for environmental citation construction.
 */

import type { Citation, CitationContext, AcademicDomain } from './citations.js';

// ========== Core Environmental Framework ==========

/**
 * Complete environmental state encompassing all 12 dimensions
 */
export interface EnvironmentalState {
  /** Unique state identifier */
  id: string;
  
  /** Timestamp of measurement */
  timestamp: Date;
  
  /** 12-dimensional measurements */
  dimensions: EnvironmentalDimensions;
  
  /** Derived environmental metrics */
  metrics: EnvironmentalMetrics;
  
  /** Environmental entropy assessment */
  entropy: EnvironmentalEntropy;
  
  /** State transition information */
  transitions: StateTransition[];
  
  /** Environmental context */
  context: EnvironmentalContext;
}

/**
 * 12-dimensional environmental measurements
 */
export interface EnvironmentalDimensions {
  /** Dimension 1: Biometric environmental state */
  biometric: BiometricDimension;
  
  /** Dimension 2: Spatial positioning and gravitational awareness */
  spatial: SpatialDimension;
  
  /** Dimension 3: Atmospheric molecular configuration */
  atmospheric: AtmosphericDimension;
  
  /** Dimension 4: Cosmic environmental conditions */
  cosmic: CosmicDimension;
  
  /** Dimension 5: Orbital mechanics and celestial dynamics */
  orbital: OrbitalDimension;
  
  /** Dimension 6: Oceanic hydrodynamic states */
  oceanic: OceanicDimension;
  
  /** Dimension 7: Geological crustal conditions */
  geological: GeologicalDimension;
  
  /** Dimension 8: Quantum environmental states */
  quantum: QuantumDimension;
  
  /** Dimension 9: Computational system configurations */
  computational: ComputationalDimension;
  
  /** Dimension 10: Acoustic environmental mapping */
  acoustic: AcousticDimension;
  
  /** Dimension 11: Ultrasonic environmental analysis */
  ultrasonic: UltrasonicDimension;
  
  /** Dimension 12: Visual photonic environmental states */
  visual: VisualDimension;
}

// ========== Individual Dimension Definitions ==========

/**
 * Biometric environmental state detection
 */
export interface BiometricDimension {
  /** Physiological arousal indicators */
  physiologicalArousal: PhysiologicalArousal;
  
  /** Vocal patterns and stress indicators */
  vocalPatterns: VocalPatterns;
  
  /** Neural state estimation */
  neuralState: NeuralStateEstimation;
  
  /** Circadian rhythm alignment */
  circadianAlignment: CircadianAlignment;
  
  /** Cognitive load assessment */
  cognitiveLoad: CognitiveLoadAssessment;
  
  /** Biometric environmental entropy */
  entropy: number;
}

/**
 * Physiological arousal indicators
 */
export interface PhysiologicalArousal {
  /** Heart rate variability estimate */
  heartRateVariability: number;
  
  /** Stress level indicator */
  stressLevel: number;
  
  /** Alertness level */
  alertnessLevel: number;
  
  /** Fatigue indicators */
  fatigueLevel: number;
  
  /** Concentration capacity */
  concentrationCapacity: number;
}

/**
 * Vocal patterns and indicators
 */
export interface VocalPatterns {
  /** Speech rate variation */
  speechRateVariation: number;
  
  /** Voice stress analysis */
  voiceStressLevel: number;
  
  /** Verbal fluency indicators */
  verbalFluency: number;
  
  /** Confidence in speech */
  speechConfidence: number;
}

/**
 * Neural state estimation
 */
export interface NeuralStateEstimation {
  /** Estimated cognitive state */
  cognitiveState: CognitiveState;
  
  /** Working memory load */
  workingMemoryLoad: number;
  
  /** Attention focus level */
  attentionFocus: number;
  
  /** Information processing speed */
  processingSpeed: number;
}

/**
 * Cognitive states
 */
export type CognitiveState = 
  | 'focused'
  | 'creative'
  | 'analytical'
  | 'fatigued'
  | 'distracted'
  | 'flow-state'
  | 'stressed'
  | 'relaxed'
  | 'energetic'
  | 'contemplative';

/**
 * Spatial positioning and gravitational field awareness
 */
export interface SpatialDimension {
  /** Physical position context */
  physicalPosition: PhysicalPosition;
  
  /** Social proximity analysis */
  socialProximity: SocialProximity;
  
  /** Environmental acoustics */
  environmentalAcoustics: EnvironmentalAcoustics;
  
  /** Gravitational field variations */
  gravitationalField: GravitationalField;
  
  /** Spatial information entropy */
  entropy: number;
}

/**
 * Physical position context
 */
export interface PhysicalPosition {
  /** Location type */
  locationType: LocationType;
  
  /** Workspace configuration */
  workspaceConfiguration: WorkspaceConfiguration;
  
  /** Environmental lighting */
  lighting: LightingConditions;
  
  /** Temperature conditions */
  temperature: TemperatureConditions;
  
  /** Air quality indicators */
  airQuality: AirQualityIndicators;
}

/**
 * Location types
 */
export type LocationType = 
  | 'home-office'
  | 'academic-office'
  | 'library'
  | 'cafe'
  | 'co-working-space'
  | 'outdoor'
  | 'laboratory'
  | 'classroom'
  | 'conference-room'
  | 'other';

/**
 * Workspace configuration
 */
export interface WorkspaceConfiguration {
  /** Ergonomic setup quality */
  ergonomicQuality: number;
  
  /** Screen configuration */
  screenConfiguration: ScreenConfiguration;
  
  /** Peripheral device setup */
  peripheralSetup: PeripheralSetup;
  
  /** Workspace organization */
  organization: number;
  
  /** Distraction level */
  distractionLevel: number;
}

/**
 * Screen configuration
 */
export interface ScreenConfiguration {
  /** Number of monitors */
  monitorCount: number;
  
  /** Screen resolution */
  resolution: string;
  
  /** Screen brightness */
  brightness: number;
  
  /** Blue light level */
  blueLightLevel: number;
  
  /** Viewing distance */
  viewingDistance: number;
}

/**
 * Computational system configurations
 */
export interface ComputationalDimension {
  /** System performance metrics */
  systemPerformance: SystemPerformance;
  
  /** Resource availability */
  resourceAvailability: ResourceAvailability;
  
  /** Network conditions */
  networkConditions: NetworkConditions;
  
  /** Software environment */
  softwareEnvironment: SoftwareEnvironment;
  
  /** Processing capacity */
  processingCapacity: ProcessingCapacity;
  
  /** Computational entropy */
  entropy: number;
}

/**
 * System performance metrics
 */
export interface SystemPerformance {
  /** CPU utilization */
  cpuUtilization: number;
  
  /** Memory usage */
  memoryUsage: number;
  
  /** Disk I/O performance */
  diskIOPerformance: number;
  
  /** System responsiveness */
  systemResponsiveness: number;
  
  /** Thermal state */
  thermalState: ThermalState;
}

/**
 * Thermal states
 */
export type ThermalState = 
  | 'optimal'
  | 'warm'
  | 'hot'
  | 'throttling'
  | 'critical';

/**
 * Resource availability
 */
export interface ResourceAvailability {
  /** Available CPU cores */
  availableCPUCores: number;
  
  /** Available memory (MB) */
  availableMemoryMB: number;
  
  /** Available storage (GB) */
  availableStorageGB: number;
  
  /** GPU availability */
  gpuAvailability: GPUAvailability;
  
  /** API quota remaining */
  apiQuotaRemaining: APIQuotaStatus;
}

/**
 * GPU availability
 */
export interface GPUAvailability {
  /** GPU available */
  available: boolean;
  
  /** GPU memory available (MB) */
  memoryMB: number;
  
  /** GPU utilization */
  utilization: number;
  
  /** GPU temperature */
  temperature: number;
}

/**
 * API quota status
 */
export interface APIQuotaStatus {
  /** OpenAI quota remaining */
  openaiQuota: QuotaInfo;
  
  /** Anthropic quota remaining */
  anthropicQuota: QuotaInfo;
  
  /** HuggingFace quota remaining */
  huggingfaceQuota: QuotaInfo;
  
  /** Google quota remaining */
  googleQuota: QuotaInfo;
}

/**
 * Quota information
 */
export interface QuotaInfo {
  /** Requests remaining */
  requestsRemaining: number;
  
  /** Tokens remaining */
  tokensRemaining: number;
  
  /** Reset time */
  resetTime: Date;
  
  /** Cost budget remaining */
  costBudgetRemaining: number;
}

/**
 * Network conditions
 */
export interface NetworkConditions {
  /** Connection speed (Mbps) */
  connectionSpeed: number;
  
  /** Latency (ms) */
  latency: number;
  
  /** Packet loss rate */
  packetLossRate: number;
  
  /** Connection stability */
  connectionStability: number;
  
  /** Bandwidth availability */
  bandwidthAvailability: number;
}

/**
 * Temporal coordination dimension
 */
export interface TemporalDimension {
  /** Current temporal context */
  temporalContext: TemporalContext;
  
  /** Temporal coordination state */
  coordinationState: TemporalCoordinationState;
  
  /** Precision enhancement factors */
  precisionEnhancement: PrecisionEnhancement;
  
  /** Temporal information streams */
  informationStreams: TemporalInformationStream[];
  
  /** Temporal entropy measurement */
  entropy: number;
}

/**
 * Temporal context
 */
export interface TemporalContext {
  /** Time of day context */
  timeOfDay: TimeOfDayContext;
  
  /** Deadline pressure */
  deadlinePressure: DeadlinePressure;
  
  /** Work session duration */
  sessionDuration: number;
  
  /** Optimal productivity window */
  productivityWindow: ProductivityWindow;
  
  /** Temporal rhythms */
  temporalRhythms: TemporalRhythms;
}

/**
 * Time of day context
 */
export interface TimeOfDayContext {
  /** Hour of day (24-hour) */
  hour: number;
  
  /** Productivity coefficient */
  productivityCoefficient: number;
  
  /** Energy level expectation */
  energyLevel: number;
  
  /** Cognitive performance expectation */
  cognitivePerformance: number;
}

/**
 * Deadline pressure assessment
 */
export interface DeadlinePressure {
  /** Time until deadline (hours) */
  timeUntilDeadline: number;
  
  /** Work remaining estimate */
  workRemaining: number;
  
  /** Pressure level */
  pressureLevel: number;
  
  /** Stress impact */
  stressImpact: number;
  
  /** Quality impact */
  qualityImpact: number;
}

// ========== Environmental Processing and Construction ==========

/**
 * Environmental information construction
 */
export interface EnvironmentalConstruction {
  /** Construction method */
  method: ConstructionMethod;
  
  /** Information sources */
  informationSources: InformationSource[];
  
  /** Construction process */
  process: ConstructionProcess;
  
  /** Construction result */
  result: ConstructionResult;
  
  /** Quality metrics */
  qualityMetrics: ConstructionQualityMetrics;
}

/**
 * Construction methods
 */
export type ConstructionMethod = 
  | 'thermodynamic-optimization'
  | 'environmental-synthesis'
  | 'precision-by-difference'
  | 'temporal-coordination'
  | 'entropy-minimization'
  | 'adaptive-construction';

/**
 * Information sources for environmental construction
 */
export interface InformationSource {
  /** Source type */
  type: InformationSourceType;
  
  /** Source reliability */
  reliability: number;
  
  /** Information quality */
  quality: number;
  
  /** Update frequency */
  updateFrequency: UpdateFrequency;
  
  /** Environmental dimension relevance */
  dimensionRelevance: DimensionRelevance;
}

/**
 * Information source types
 */
export type InformationSourceType = 
  | 'sensor-data'
  | 'system-metrics'
  | 'user-behavior'
  | 'contextual-inference'
  | 'historical-patterns'
  | 'real-time-measurement'
  | 'external-apis'
  | 'calculated-metrics';

/**
 * Update frequencies
 */
export type UpdateFrequency = 
  | 'real-time'
  | 'high-frequency' // < 1 second
  | 'medium-frequency' // 1-10 seconds
  | 'low-frequency' // 10-60 seconds
  | 'periodic' // > 60 seconds
  | 'on-demand'
  | 'event-driven';

/**
 * Dimension relevance mapping
 */
export interface DimensionRelevance {
  /** Biometric relevance */
  biometric: number;
  
  /** Spatial relevance */
  spatial: number;
  
  /** Atmospheric relevance */
  atmospheric: number;
  
  /** Cosmic relevance */
  cosmic: number;
  
  /** Orbital relevance */
  orbital: number;
  
  /** Oceanic relevance */
  oceanic: number;
  
  /** Geological relevance */
  geological: number;
  
  /** Quantum relevance */
  quantum: number;
  
  /** Computational relevance */
  computational: number;
  
  /** Acoustic relevance */
  acoustic: number;
  
  /** Ultrasonic relevance */
  ultrasonic: number;
  
  /** Visual relevance */
  visual: number;
}

// ========== Environmental Metrics and Analysis ==========

/**
 * Environmental metrics derived from dimensional measurements
 */
export interface EnvironmentalMetrics {
  /** Overall environmental quality */
  overallQuality: number;
  
  /** Environmental stability */
  stability: number;
  
  /** Information richness */
  informationRichness: number;
  
  /** Construction potential */
  constructionPotential: number;
  
  /** Dimensional coherence */
  dimensionalCoherence: DimensionalCoherence;
  
  /** Optimization opportunities */
  optimizationOpportunities: OptimizationOpportunity[];
}

/**
 * Dimensional coherence assessment
 */
export interface DimensionalCoherence {
  /** Cross-dimensional correlation */
  crossDimensionalCorrelation: number;
  
  /** Dimensional alignment */
  dimensionalAlignment: number;
  
  /** Information consistency */
  informationConsistency: number;
  
  /** Measurement reliability */
  measurementReliability: number;
}

/**
 * Environmental entropy assessment
 */
export interface EnvironmentalEntropy {
  /** Total system entropy */
  totalEntropy: number;
  
  /** Entropy by dimension */
  dimensionalEntropy: Record<string, number>;
  
  /** Entropy trends */
  entropyTrends: EntropyTrend[];
  
  /** Information entropy */
  informationEntropy: number;
  
  /** Thermodynamic entropy */
  thermodynamicEntropy: number;
}

/**
 * Entropy trend analysis
 */
export interface EntropyTrend {
  /** Dimension */
  dimension: string;
  
  /** Trend direction */
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'oscillating';
  
  /** Trend magnitude */
  trendMagnitude: number;
  
  /** Trend duration */
  trendDuration: number;
  
  /** Predicted evolution */
  predictedEvolution: EntropyEvolution;
}

/**
 * Entropy evolution prediction
 */
export interface EntropyEvolution {
  /** Short term prediction */
  shortTerm: number;
  
  /** Medium term prediction */
  mediumTerm: number;
  
  /** Long term prediction */
  longTerm: number;
  
  /** Confidence in predictions */
  confidence: number;
}

// ========== Environmental Context and State Management ==========

/**
 * Environmental context for citation processing
 */
export interface EnvironmentalContext {
  /** Writing session context */
  writingSession: WritingSessionContext;
  
  /** Document context */
  documentContext: DocumentEnvironmentContext;
  
  /** User context */
  userContext: UserEnvironmentContext;
  
  /** Collaboration context */
  collaborationContext: CollaborationContext;
  
  /** External context */
  externalContext: ExternalEnvironmentContext;
}

/**
 * Writing session context
 */
export interface WritingSessionContext {
  /** Session start time */
  sessionStart: Date;
  
  /** Session duration so far */
  currentDuration: number;
  
  /** Words written this session */
  wordsWritten: number;
  
  /** Citations processed this session */
  citationsProcessed: number;
  
  /** Session productivity */
  productivity: SessionProductivity;
  
  /** Break patterns */
  breakPatterns: BreakPattern[];
}

/**
 * Session productivity assessment
 */
export interface SessionProductivity {
  /** Words per minute */
  wordsPerMinute: number;
  
  /** Quality score trend */
  qualityTrend: number;
  
  /** Error rate trend */
  errorRate: number;
  
  /** Focus stability */
  focusStability: number;
}

/**
 * State transition information
 */
export interface StateTransition {
  /** Previous state ID */
  previousStateId: string;
  
  /** Transition timestamp */
  timestamp: Date;
  
  /** Transition trigger */
  trigger: TransitionTrigger;
  
  /** Transition duration */
  duration: number;
  
  /** State change magnitude */
  changeMagnitude: number;
  
  /** Affected dimensions */
  affectedDimensions: string[];
}

/**
 * Transition triggers
 */
export type TransitionTrigger = 
  | 'user-action'
  | 'system-event'
  | 'environmental-change'
  | 'time-based'
  | 'threshold-exceeded'
  | 'external-stimulus'
  | 'feedback-loop'
  | 'optimization-cycle';

// ========== Precision-by-Difference Enhancement ==========

/**
 * Precision-by-difference coordination
 */
export interface PrecisionByDifferenceCoordination {
  /** Local measurement capabilities */
  localCapabilities: MeasurementCapability[];
  
  /** Reference standards */
  referenceStandards: ReferenceStandard[];
  
  /** Enhanced precision variables */
  enhancedPrecisionVariables: EnhancedPrecisionVariable[];
  
  /** Coordination mechanisms */
  coordinationMechanisms: CoordinationMechanism[];
  
  /** Precision enhancement metrics */
  enhancementMetrics: PrecisionEnhancementMetrics;
}

/**
 * Measurement capability
 */
export interface MeasurementCapability {
  /** Capability ID */
  id: string;
  
  /** Measurement type */
  type: MeasurementType;
  
  /** Measurement precision */
  precision: number;
  
  /** Measurement range */
  range: MeasurementRange;
  
  /** Update frequency */
  updateFrequency: UpdateFrequency;
  
  /** Reliability score */
  reliability: number;
}

/**
 * Measurement types
 */
export type MeasurementType = 
  | 'temporal'
  | 'spatial'
  | 'computational'
  | 'environmental'
  | 'behavioral'
  | 'contextual'
  | 'semantic'
  | 'quality';

/**
 * Measurement range
 */
export interface MeasurementRange {
  /** Minimum value */
  minimum: number;
  
  /** Maximum value */
  maximum: number;
  
  /** Units */
  units: string;
  
  /** Resolution */
  resolution: number;
}

/**
 * Reference standard
 */
export interface ReferenceStandard {
  /** Standard ID */
  id: string;
  
  /** Standard type */
  type: ReferenceStandardType;
  
  /** Standard precision */
  precision: number;
  
  /** Calibration date */
  calibrationDate: Date;
  
  /** Uncertainty bounds */
  uncertaintyBounds: UncertaintyBounds;
  
  /** Traceability chain */
  traceabilityChain: string[];
}

/**
 * Reference standard types
 */
export type ReferenceStandardType = 
  | 'temporal-reference'
  | 'frequency-reference'
  | 'quality-reference'
  | 'performance-reference'
  | 'environmental-reference'
  | 'computational-reference';

/**
 * Enhanced precision variable
 */
export interface EnhancedPrecisionVariable {
  /** Variable ID */
  id: string;
  
  /** Variable name */
  name: string;
  
  /** Enhanced precision value */
  value: number;
  
  /** Precision enhancement factor */
  enhancementFactor: number;
  
  /** Individual component precisions */
  componentPrecisions: number[];
  
  /** Coordination method used */
  coordinationMethod: CoordinationMethodType;
  
  /** Reliability assessment */
  reliability: number;
}

/**
 * Coordination method types
 */
export type CoordinationMethodType = 
  | 'differential-measurement'
  | 'cross-correlation'
  | 'statistical-combination'
  | 'temporal-averaging'
  | 'frequency-domain-analysis'
  | 'multi-reference-fusion';

// ========== Export Collections ==========

/**
 * All environmental intelligence types for easy importing
 */
export type {
  // Core environmental types
  EnvironmentalState,
  EnvironmentalDimensions,
  EnvironmentalMetrics,
  EnvironmentalEntropy,
  EnvironmentalContext,
  
  // Individual dimension types
  BiometricDimension,
  SpatialDimension,
  ComputationalDimension,
  TemporalDimension,
  
  // Specific measurement types
  PhysiologicalArousal,
  SystemPerformance,
  NetworkConditions,
  TemporalContext,
  WritingSessionContext,
  
  // Construction and processing types
  EnvironmentalConstruction,
  InformationSource,
  DimensionalCoherence,
  StateTransition,
  
  // Precision enhancement types
  PrecisionByDifferenceCoordination,
  MeasurementCapability,
  ReferenceStandard,
  EnhancedPrecisionVariable,
  
  // Context and management types
  DocumentEnvironmentContext,
  UserEnvironmentContext,
  CollaborationContext,
  SessionProductivity
};

/**
 * All environmental enums for easy importing
 */
export type {
  CognitiveState,
  LocationType,
  ThermalState,
  ConstructionMethod,
  InformationSourceType,
  UpdateFrequency,
  TransitionTrigger,
  MeasurementType,
  ReferenceStandardType,
  CoordinationMethodType
};
