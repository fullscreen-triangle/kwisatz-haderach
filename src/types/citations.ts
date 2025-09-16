/**
 * Core citation types for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * These types define the fundamental structures for citation processing,
 * validation, and intelligence across all framework components.
 */

// ========== Core Citation Structures ==========

/**
 * Citation styles supported by the framework
 */
export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'IEEE' | 'Harvard' | 'Vancouver' | 'Nature' | 'Custom';

/**
 * Academic domains for specialized processing
 */
export type AcademicDomain = 
  | 'medical' 
  | 'legal' 
  | 'computer-science' 
  | 'social-sciences' 
  | 'natural-sciences' 
  | 'humanities' 
  | 'engineering' 
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'psychology'
  | 'history'
  | 'philosophy'
  | 'linguistics'
  | 'economics'
  | 'interdisciplinary';

/**
 * Citation source types
 */
export type CitationSourceType = 
  | 'journal-article'
  | 'book'
  | 'book-chapter'
  | 'conference-paper'
  | 'thesis'
  | 'website'
  | 'report'
  | 'patent'
  | 'dataset'
  | 'software'
  | 'preprint'
  | 'newspaper'
  | 'magazine'
  | 'government-document'
  | 'legal-case'
  | 'statute'
  | 'interview'
  | 'personal-communication'
  | 'archival-document'
  | 'unknown';

/**
 * Core citation entity representing a single citation
 */
export interface Citation {
  /** Unique identifier for this citation */
  id: string;
  
  /** Citation content and metadata */
  content: CitationContent;
  
  /** Position and context within the document */
  context: CitationContext;
  
  /** Validation status and results */
  validation: CitationValidation;
  
  /** Quality assessment metrics */
  quality: QualityAssessment;
  
  /** Source classification and metadata */
  source: CitationSource;
  
  /** Timestamps for tracking */
  metadata: CitationMetadata;
}

/**
 * Citation content and formatting information
 */
export interface CitationContent {
  /** Raw citation text as it appears */
  rawText: string;
  
  /** Parsed and structured citation data */
  structured: StructuredCitation;
  
  /** Formatted citation in target style */
  formatted: FormattedCitation;
  
  /** In-text citation format */
  inText: InTextCitation;
  
  /** Bibliography/reference list entry */
  bibliography: BibliographyEntry;
}

/**
 * Structured citation data with parsed fields
 */
export interface StructuredCitation {
  /** Author information */
  authors: Author[];
  
  /** Publication title */
  title: string;
  
  /** Container title (journal, book, etc.) */
  containerTitle?: string;
  
  /** Publication date */
  date: PublicationDate;
  
  /** Publisher information */
  publisher?: Publisher;
  
  /** Volume, issue, page numbers */
  volume?: string;
  issue?: string;
  pages?: PageRange;
  
  /** Digital identifiers */
  doi?: string;
  isbn?: string;
  issn?: string;
  url?: string;
  
  /** Additional fields */
  edition?: string;
  location?: string;
  abstract?: string;
  keywords?: string[];
}

/**
 * Author information
 */
export interface Author {
  /** Full name */
  name: string;
  
  /** Given name(s) */
  given?: string;
  
  /** Family name */
  family?: string;
  
  /** Suffix (Jr., III, etc.) */
  suffix?: string;
  
  /** Institutional affiliation */
  affiliation?: string[];
  
  /** ORCID identifier */
  orcid?: string;
}

/**
 * Publication date information
 */
export interface PublicationDate {
  /** Year of publication */
  year: number;
  
  /** Month of publication */
  month?: number;
  
  /** Day of publication */
  day?: number;
  
  /** Season or special date */
  season?: string;
  
  /** Circa/approximate flag */
  circa?: boolean;
  
  /** Raw date string if parsing failed */
  raw?: string;
}

/**
 * Publisher information
 */
export interface Publisher {
  /** Publisher name */
  name: string;
  
  /** Publication location */
  location?: string;
  
  /** Publisher type */
  type?: 'commercial' | 'academic' | 'government' | 'non-profit' | 'self-published';
}

/**
 * Page range information
 */
export interface PageRange {
  /** Starting page */
  start: string | number;
  
  /** Ending page */
  end?: string | number;
  
  /** Total page count */
  total?: number;
  
  /** Article number (for journals without pages) */
  articleNumber?: string;
}

// ========== Citation Context and Positioning ==========

/**
 * Citation context within the document
 */
export interface CitationContext {
  /** Document position information */
  position: DocumentPosition;
  
  /** Surrounding text and argumentative context */
  argumentative: ArgumentativeContext;
  
  /** Semantic relationships */
  semantic: SemanticContext;
  
  /** Intent and purpose */
  intent: IntentContext;
  
  /** Environmental context */
  environmental: EnvironmentalContext;
}

/**
 * Physical position within the document
 */
export interface DocumentPosition {
  /** Line number */
  line: number;
  
  /** Character position */
  character: number;
  
  /** Paragraph number */
  paragraph: number;
  
  /** Section information */
  section: SectionInfo;
  
  /** Range in document */
  range: TextRange;
}

/**
 * Document section information
 */
export interface SectionInfo {
  /** Section title */
  title: string;
  
  /** Section type */
  type: 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'abstract' | 'references' | 'appendix' | 'other';
  
  /** Section level (1 = main section, 2 = subsection, etc.) */
  level: number;
  
  /** Section number */
  number?: string;
}

/**
 * Text range specification
 */
export interface TextRange {
  /** Start position */
  start: Position;
  
  /** End position */
  end: Position;
}

/**
 * Position coordinates
 */
export interface Position {
  /** Line number (0-based) */
  line: number;
  
  /** Character number (0-based) */
  character: number;
}

/**
 * Argumentative context for citation
 */
export interface ArgumentativeContext {
  /** Claim being supported */
  claim: string;
  
  /** Type of support provided */
  supportType: SupportType;
  
  /** Strength of support */
  supportStrength: number; // 0-1 scale
  
  /** Surrounding claims */
  surroundingClaims: string[];
  
  /** Counter-arguments addressed */
  counterArguments?: string[];
  
  /** Logical relationship to argument */
  logicalRelation: LogicalRelation;
}

/**
 * Types of support a citation can provide
 */
export type SupportType = 
  | 'empirical-evidence'
  | 'theoretical-foundation'
  | 'methodological-precedent'
  | 'definitional'
  | 'comparative'
  | 'historical-context'
  | 'expert-opinion'
  | 'statistical-data'
  | 'case-study'
  | 'counter-example'
  | 'replication'
  | 'meta-analysis'
  | 'background-information';

/**
 * Logical relationship types
 */
export type LogicalRelation = 
  | 'supports'
  | 'contradicts'
  | 'extends'
  | 'challenges'
  | 'confirms'
  | 'refutes'
  | 'contextualizes'
  | 'exemplifies'
  | 'qualifies'
  | 'synthesizes';

// ========== Citation Validation and Quality ==========

/**
 * Comprehensive citation validation results
 */
export interface CitationValidation {
  /** Overall validation status */
  status: ValidationStatus;
  
  /** Intent validation results */
  intent: IntentValidationResult;
  
  /** Boundary validation results */
  boundary: BoundaryValidationResult;
  
  /** Bias validation results */
  bias: BiasValidationResult;
  
  /** Format validation results */
  format: FormatValidationResult;
  
  /** Accuracy validation results */
  accuracy: AccuracyValidationResult;
  
  /** Validation timestamp */
  timestamp: Date;
  
  /** Validation confidence */
  confidence: number; // 0-1 scale
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
  | 'unknown';

/**
 * Intent validation results (from Integrated Validation Architecture)
 */
export interface IntentValidationResult {
  /** Does citation address actual user intent? */
  addressesIntent: boolean;
  
  /** Confidence in intent interpretation */
  intentConfidence: number;
  
  /** Alternative interpretations considered */
  alternativeInterpretations: IntentInterpretation[];
  
  /** Counterfactual analysis results */
  counterfactualAnalysis: CounterfactualResult[];
  
  /** Intent validation score */
  score: number;
}

/**
 * Intent interpretation
 */
export interface IntentInterpretation {
  /** Interpretation description */
  interpretation: string;
  
  /** Probability of this interpretation */
  probability: number;
  
  /** Supporting evidence */
  evidence: string[];
}

/**
 * Counterfactual analysis result
 */
export interface CounterfactualResult {
  /** Scenario description */
  scenario: string;
  
  /** Would citation be appropriate in this scenario? */
  appropriate: boolean;
  
  /** Confidence in assessment */
  confidence: number;
  
  /** Reasoning */
  reasoning: string;
}

/**
 * Quality assessment metrics
 */
export interface QualityAssessment {
  /** Overall quality score */
  overall: number; // 0-100 scale
  
  /** Individual quality dimensions */
  dimensions: QualityDimensions;
  
  /** Quality trends over time */
  trends: QualityTrends;
  
  /** Improvement recommendations */
  recommendations: QualityRecommendation[];
  
  /** Assessment metadata */
  metadata: QualityMetadata;
}

/**
 * Quality assessment dimensions
 */
export interface QualityDimensions {
  /** Relevance to claim */
  relevance: number;
  
  /** Source credibility */
  credibility: number;
  
  /** Recency/timeliness */
  recency: number;
  
  /** Accessibility */
  accessibility: number;
  
  /** Completeness of citation */
  completeness: number;
  
  /** Format correctness */
  format: number;
  
  /** Integration quality */
  integration: number;
}

/**
 * Source information and metadata
 */
export interface CitationSource {
  /** Source type classification */
  type: CitationSourceType;
  
  /** Academic domain */
  domain: AcademicDomain;
  
  /** Impact metrics */
  impact: ImpactMetrics;
  
  /** Credibility assessment */
  credibility: CredibilityAssessment;
  
  /** Access information */
  access: AccessInfo;
}

/**
 * Impact metrics for sources
 */
export interface ImpactMetrics {
  /** Journal impact factor */
  impactFactor?: number;
  
  /** Citation count */
  citationCount?: number;
  
  /** H-index of authors */
  authorHIndex?: number[];
  
  /** Altmetric score */
  altmetricScore?: number;
  
  /** Download/view counts */
  downloadCount?: number;
}

/**
 * Credibility assessment
 */
export interface CredibilityAssessment {
  /** Overall credibility score */
  score: number; // 0-100 scale
  
  /** Peer review status */
  peerReviewed: boolean;
  
  /** Publisher reputation */
  publisherReputation: number;
  
  /** Author expertise */
  authorExpertise: number;
  
  /** Methodology quality */
  methodologyQuality?: number;
  
  /** Potential conflicts of interest */
  conflictsOfInterest: string[];
  
  /** Retraction status */
  retracted: boolean;
}

// ========== Formatted Citations ==========

/**
 * Formatted citation in specific style
 */
export interface FormattedCitation {
  /** Citation style used */
  style: CitationStyle;
  
  /** In-text citation formats */
  inText: {
    /** Narrative citation */
    narrative: string;
    
    /** Parenthetical citation */
    parenthetical: string;
    
    /** Author-only citation */
    authorOnly: string;
    
    /** Year-only citation */
    yearOnly: string;
  };
  
  /** Bibliography entry */
  bibliography: string;
  
  /** HTML formatted versions */
  html: {
    inText: string;
    bibliography: string;
  };
  
  /** LaTeX formatted versions */
  latex: {
    inText: string;
    bibliography: string;
  };
}

/**
 * In-text citation information
 */
export interface InTextCitation {
  /** Citation key or identifier */
  key: string;
  
  /** Page numbers or location */
  locator?: string;
  
  /** Prefix text */
  prefix?: string;
  
  /** Suffix text */
  suffix?: string;
  
  /** Suppress author name */
  suppressAuthor?: boolean;
  
  /** Citation mode */
  mode: 'narrative' | 'parenthetical' | 'note';
}

/**
 * Bibliography entry
 */
export interface BibliographyEntry {
  /** Formatted entry */
  formatted: string;
  
  /** Sort key */
  sortKey: string;
  
  /** Entry type */
  entryType: string;
  
  /** BibTeX entry */
  bibtex?: string;
  
  /** RIS entry */
  ris?: string;
  
  /** EndNote XML */
  endnote?: string;
}

// ========== Citation Processing and Analysis ==========

/**
 * Citation analysis results
 */
export interface CitationAnalysisResult {
  /** Processed citations */
  citations: Citation[];
  
  /** Analysis summary */
  summary: AnalysisSummary;
  
  /** Recommendations */
  recommendations: CitationRecommendation[];
  
  /** Issues found */
  issues: CitationIssue[];
  
  /** Processing metadata */
  metadata: AnalysisMetadata;
}

/**
 * Analysis summary statistics
 */
export interface AnalysisSummary {
  /** Total citations processed */
  totalCitations: number;
  
  /** Valid citations */
  validCitations: number;
  
  /** Citations with issues */
  issueCount: number;
  
  /** Average quality score */
  averageQuality: number;
  
  /** Domain distribution */
  domainDistribution: Record<AcademicDomain, number>;
  
  /** Style distribution */
  styleDistribution: Record<CitationStyle, number>;
  
  /** Source type distribution */
  sourceTypeDistribution: Record<CitationSourceType, number>;
}

/**
 * Citation recommendation
 */
export interface CitationRecommendation {
  /** Recommendation ID */
  id: string;
  
  /** Target citation */
  citationId: string;
  
  /** Recommendation type */
  type: RecommendationType;
  
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  
  /** Description */
  description: string;
  
  /** Suggested fix */
  suggestedFix?: string;
  
  /** Auto-fix available */
  autoFixAvailable: boolean;
  
  /** Confidence in recommendation */
  confidence: number;
}

/**
 * Types of recommendations
 */
export type RecommendationType = 
  | 'format-correction'
  | 'missing-information'
  | 'style-inconsistency'
  | 'better-source-available'
  | 'intent-mismatch'
  | 'credibility-concern'
  | 'accessibility-improvement'
  | 'completeness-enhancement'
  | 'integration-improvement'
  | 'duplicate-citation'
  | 'missing-citation'
  | 'over-citation';

/**
 * Citation issue
 */
export interface CitationIssue {
  /** Issue ID */
  id: string;
  
  /** Target citation */
  citationId: string;
  
  /** Issue type */
  type: IssueType;
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  
  /** Issue description */
  description: string;
  
  /** Location in document */
  location: DocumentPosition;
  
  /** Suggested resolution */
  resolution?: string;
}

/**
 * Types of citation issues
 */
export type IssueType = 
  | 'parsing-error'
  | 'format-error'
  | 'missing-field'
  | 'invalid-doi'
  | 'broken-url'
  | 'duplicate-citation'
  | 'inconsistent-style'
  | 'credibility-warning'
  | 'accessibility-issue'
  | 'intent-validation-failure'
  | 'boundary-violation'
  | 'bias-concern';

// ========== Metadata and Tracking ==========

/**
 * Citation metadata for tracking and management
 */
export interface CitationMetadata {
  /** Creation timestamp */
  created: Date;
  
  /** Last modified timestamp */
  modified: Date;
  
  /** Processing history */
  processingHistory: ProcessingEvent[];
  
  /** Source document information */
  sourceDocument: DocumentInfo;
  
  /** User interactions */
  userInteractions: UserInteraction[];
  
  /** Version information */
  version: string;
}

/**
 * Processing event
 */
export interface ProcessingEvent {
  /** Event timestamp */
  timestamp: Date;
  
  /** Event type */
  type: string;
  
  /** Event description */
  description: string;
  
  /** Processing duration */
  duration?: number;
  
  /** Success status */
  success: boolean;
  
  /** Error information */
  error?: string;
}

/**
 * Source document information
 */
export interface DocumentInfo {
  /** Document path */
  path: string;
  
  /** Document type */
  type: 'latex' | 'markdown' | 'plaintext' | 'word' | 'pdf' | 'other';
  
  /** Document title */
  title?: string;
  
  /** Document authors */
  authors?: string[];
  
  /** Document domain */
  domain?: AcademicDomain;
  
  /** Target citation style */
  targetStyle: CitationStyle;
}

/**
 * User interaction tracking
 */
export interface UserInteraction {
  /** Interaction timestamp */
  timestamp: Date;
  
  /** Interaction type */
  type: 'view' | 'edit' | 'accept-recommendation' | 'reject-recommendation' | 'manual-fix' | 'validation-request';
  
  /** User action details */
  details: Record<string, unknown>;
}

// ========== Export Collections ==========

/**
 * All citation-related types for easy importing
 */
export type {
  // Core types
  Citation,
  CitationContent,
  StructuredCitation,
  Author,
  PublicationDate,
  Publisher,
  PageRange,
  
  // Context types
  CitationContext,
  DocumentPosition,
  SectionInfo,
  TextRange,
  Position,
  ArgumentativeContext,
  
  // Validation types
  CitationValidation,
  IntentValidationResult,
  IntentInterpretation,
  CounterfactualResult,
  
  // Quality types
  QualityAssessment,
  QualityDimensions,
  
  // Source types
  CitationSource,
  ImpactMetrics,
  CredibilityAssessment,
  
  // Format types
  FormattedCitation,
  InTextCitation,
  BibliographyEntry,
  
  // Analysis types
  CitationAnalysisResult,
  AnalysisSummary,
  CitationRecommendation,
  CitationIssue,
  
  // Metadata types
  CitationMetadata,
  ProcessingEvent,
  DocumentInfo,
  UserInteraction
};

/**
 * All citation enums for easy importing
 */
export type {
  CitationStyle,
  AcademicDomain,
  CitationSourceType,
  SupportType,
  LogicalRelation,
  ValidationStatus,
  RecommendationType,
  IssueType
};
