/**
 * Citation Parser for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * Extracts and parses citations from academic documents in various formats.
 */

import * as vscode from 'vscode';
import type { 
  Citation,
  CitationContent,
  StructuredCitation,
  Author,
  PublicationDate,
  Publisher,
  PageRange,
  CitationContext,
  DocumentPosition,
  ArgumentativeContext,
  CitationStyle,
  CitationSourceType,
  InTextCitation,
  BibliographyEntry,
  FormattedCitation,
  CitationSource,
  SupportType,
  LogicalRelation
} from '@/types/citations.js';

import { Logger } from './logging.js';
import { TextProcessor } from './text-processing.js';

/**
 * Citation parsing configuration
 */
interface CitationParsingConfig {
  /** Maximum citations to extract */
  maxCitations: number;
  
  /** Include in-text citations */
  includeInText: boolean;
  
  /** Include bibliography entries */
  includeBibliography: boolean;
  
  /** Minimum citation length */
  minCitationLength: number;
  
  /** Confidence threshold for extraction */
  confidenceThreshold: number;
}

/**
 * Citation match result
 */
interface CitationMatch {
  /** Matched text */
  text: string;
  
  /** Start position */
  start: number;
  
  /** End position */
  end: number;
  
  /** Citation type */
  type: 'in-text' | 'bibliography' | 'footnote';
  
  /** Confidence score */
  confidence: number;
  
  /** Citation style detected */
  style: CitationStyle;
}

/**
 * Parsing context
 */
interface ParsingContext {
  /** Document text */
  documentText: string;
  
  /** Document type */
  documentType: 'latex' | 'markdown' | 'plaintext' | 'other';
  
  /** Detected citation style */
  detectedStyle: CitationStyle;
  
  /** Document sections */
  sections: DocumentSection[];
}

interface DocumentSection {
  title: string;
  content: string;
  startLine: number;
  endLine: number;
  type: string;
}

/**
 * Citation Parser implementation
 */
export class CitationParser {
  private readonly logger: Logger;
  private readonly textProcessor: TextProcessor;
  private config: CitationParsingConfig;

  // Citation patterns for different styles
  private readonly citationPatterns = {
    apa: {
      inText: [
        /\(([^)]*\d{4}[^)]*)\)/g,              // (Author, 2023)
        /\b(\w+(?:\s+et\s+al\.?)?),?\s+\((\d{4})\)/g,  // Author (2023) or Author et al. (2023)
        /\b(\w+(?:\s+et\s+al\.?)?)\s+\((\d{4}),\s*p\.\s*(\d+)\)/g  // Author (2023, p. 123)
      ],
      bibliography: [
        /^([^.]+)\.\s*\((\d{4})\)\.\s*([^.]+)\.\s*(.+)$/gm  // Author. (2023). Title. Source.
      ]
    },
    mla: {
      inText: [
        /\(([^)]*\d+[^)]*)\)/g,               // (Author 123)
        /\b(\w+(?:\s+et\s+al\.?)?)\s+(\d+)/g  // Author 123
      ],
      bibliography: [
        /^([^.]+)\.\s*"([^"]+)"\.\s*([^,]+),\s*(.+)$/gm  // Author. "Title". Source, details.
      ]
    },
    chicago: {
      inText: [
        /\^(\d+)/g,                           // ^1 (footnote style)
        /\(([^)]*\d{4}[^)]*)\)/g              // (Author 2023)
      ],
      bibliography: [
        /^([^.]+)\.\s*([^.]+)\.\s*(.+):\s*([^,]+),\s*(\d{4})\.$/gm
      ]
    },
    ieee: {
      inText: [
        /\[(\d+(?:-\d+)?(?:,\s*\d+)*)\]/g     // [1], [1-3], [1, 2, 3]
      ],
      bibliography: [
        /^\[(\d+)\]\s*([^,]+),\s*"([^"]+)",\s*(.+)$/gm  // [1] Author, "Title", Source
      ]
    }
  };

  constructor() {
    this.logger = Logger.getInstance();
    this.textProcessor = new TextProcessor();
    
    // Default configuration
    this.config = {
      maxCitations: 200,
      includeInText: true,
      includeBibliography: true,
      minCitationLength: 5,
      confidenceThreshold: 0.6
    };
  }

  /**
   * Initialize citation parser
   */
  async initialize(): Promise<void> {
    this.logger.info('📚 Initializing Citation Parser...');
    // Any initialization logic would go here
    this.logger.info('✅ Citation Parser initialized');
  }

  /**
   * Extract citations from document
   */
  async extractCitations(text: string, document: vscode.TextDocument): Promise<Citation[]> {
    this.logger.info('🔍 Extracting citations from document...');
    
    const extractionStart = performance.now();
    
    try {
      // Create parsing context
      const context = await this.createParsingContext(text, document);
      
      // Find citation matches
      const matches = await this.findCitationMatches(context);
      
      // Parse matches into structured citations
      const citations = await this.parseMatches(matches, context, document);
      
      // Filter and validate citations
      const validCitations = await this.validateCitations(citations);
      
      const extractionTime = performance.now() - extractionStart;
      
      this.logger.info(`✅ Extracted ${validCitations.length} citations in ${extractionTime.toFixed(2)}ms`);
      
      return validCitations.slice(0, this.config.maxCitations);
      
    } catch (error) {
      this.logger.error('❌ Citation extraction failed:', error);
      throw new Error(`Citation extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse specific citation text
   */
  async parseCitationText(citationText: string, style: CitationStyle = 'APA'): Promise<StructuredCitation> {
    try {
      switch (style.toLowerCase()) {
        case 'apa':
          return await this.parseAPACitation(citationText);
        case 'mla':
          return await this.parseMLACitation(citationText);
        case 'chicago':
          return await this.parseChicagoCitation(citationText);
        case 'ieee':
          return await this.parseIEEECitation(citationText);
        default:
          return await this.parseGenericCitation(citationText);
      }
    } catch (error) {
      this.logger.warn(`Failed to parse citation text: ${citationText}`, error);
      return this.createFallbackStructuredCitation(citationText);
    }
  }

  /**
   * Detect citation style in document
   */
  async detectCitationStyle(text: string): Promise<CitationStyle> {
    const styleScores: Record<CitationStyle, number> = {
      'APA': 0, 'MLA': 0, 'Chicago': 0, 'IEEE': 0, 
      'Harvard': 0, 'Vancouver': 0, 'Nature': 0, 'Custom': 0
    };

    // Check for APA patterns
    if (/\([^)]*\d{4}[^)]*\)/.test(text)) styleScores.APA += 2;
    if (/et\s+al\./.test(text)) styleScores.APA += 1;
    
    // Check for MLA patterns
    if (/\([^)]*\d+[^)]*\)/.test(text) && !/\d{4}/.test(text)) styleScores.MLA += 2;
    
    // Check for Chicago patterns
    if (/\^?\d+/.test(text)) styleScores.Chicago += 1;
    
    // Check for IEEE patterns
    if (/\[\d+(?:-\d+)?(?:,\s*\d+)*\]/.test(text)) styleScores.IEEE += 3;
    
    // Check for Vancouver (similar to IEEE but in medical contexts)
    if (/\[\d+\]/.test(text) && this.isMedicalContext(text)) styleScores.Vancouver += 2;

    // Find highest scoring style
    const topStyle = Object.entries(styleScores)
      .reduce((a, b) => styleScores[a[0] as CitationStyle] > styleScores[b[0] as CitationStyle] ? a : b)[0] as CitationStyle;

    return styleScores[topStyle] > 0 ? topStyle : 'APA';
  }

  // ========== Private Methods ==========

  /**
   * Create parsing context
   */
  private async createParsingContext(text: string, document: vscode.TextDocument): Promise<ParsingContext> {
    const documentType = this.detectDocumentType(document);
    const detectedStyle = await this.detectCitationStyle(text);
    const sections = await this.extractDocumentSections(text);

    return {
      documentText: text,
      documentType,
      detectedStyle,
      sections
    };
  }

  /**
   * Detect document type
   */
  private detectDocumentType(document: vscode.TextDocument): ParsingContext['documentType'] {
    const fileName = document.fileName.toLowerCase();
    const content = document.getText();

    if (fileName.endsWith('.tex') || content.includes('\\documentclass')) {
      return 'latex';
    }
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      return 'markdown';
    }
    if (document.languageId === 'plaintext') {
      return 'plaintext';
    }
    return 'other';
  }

  /**
   * Extract document sections
   */
  private async extractDocumentSections(text: string): Promise<DocumentSection[]> {
    const sections: DocumentSection[] = [];
    const lines = text.split('\n');
    
    let currentSection: DocumentSection | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect section headers
      if (this.isSectionHeader(line)) {
        // Save previous section
        if (currentSection) {
          currentSection.endLine = i - 1;
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: this.cleanSectionTitle(line),
          content: '',
          startLine: i,
          endLine: i,
          type: this.classifySectionType(line)
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
        currentSection.endLine = i;
      }
    }
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Find citation matches in text
   */
  private async findCitationMatches(context: ParsingContext): Promise<CitationMatch[]> {
    const matches: CitationMatch[] = [];
    const { documentText, detectedStyle } = context;

    // Get patterns for detected style
    const patterns = this.citationPatterns[detectedStyle.toLowerCase() as keyof typeof this.citationPatterns] 
      || this.citationPatterns.apa;

    // Find in-text citations
    if (this.config.includeInText && patterns.inText) {
      for (const pattern of patterns.inText) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(documentText)) !== null) {
          matches.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            type: 'in-text',
            confidence: this.calculateMatchConfidence(match[0], 'in-text'),
            style: detectedStyle
          });
        }
      }
    }

    // Find bibliography entries
    if (this.config.includeBibliography && patterns.bibliography) {
      for (const pattern of patterns.bibliography) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(documentText)) !== null) {
          matches.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            type: 'bibliography',
            confidence: this.calculateMatchConfidence(match[0], 'bibliography'),
            style: detectedStyle
          });
        }
      }
    }

    return matches.filter(match => 
      match.text.length >= this.config.minCitationLength &&
      match.confidence >= this.config.confidenceThreshold
    );
  }

  /**
   * Parse matches into citations
   */
  private async parseMatches(
    matches: CitationMatch[], 
    context: ParsingContext, 
    document: vscode.TextDocument
  ): Promise<Citation[]> {
    const citations: Citation[] = [];

    for (const match of matches) {
      try {
        const citation = await this.parseMatch(match, context, document);
        if (citation) {
          citations.push(citation);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse citation match: ${match.text}`, error);
      }
    }

    return citations;
  }

  /**
   * Parse a single match into a citation
   */
  private async parseMatch(
    match: CitationMatch, 
    context: ParsingContext, 
    document: vscode.TextDocument
  ): Promise<Citation | null> {
    const citationId = this.generateCitationId();
    
    // Parse structured citation
    const structured = await this.parseCitationText(match.text, match.style);
    
    // Create citation content
    const content = this.createCitationContent(match.text, structured);
    
    // Create citation context
    const citationContext = this.createCitationContext(match, context, document);
    
    // Create citation source
    const source = this.createCitationSource(structured, context);

    return {
      id: citationId,
      content,
      context: citationContext,
      validation: {
        status: 'pending',
        intent: {
          addressesActualIntent: true,
          intentConfidence: 0.8,
          alternativeInterpretations: [],
          counterfactualAnalysis: [],
          score: 80
        },
        boundary: {
          constraintsSatisfied: true,
          constraintAnalysis: {
            domainConstraints: [],
            styleConstraints: [],
            qualityConstraints: [],
            feasibilityConstraints: []
          },
          ridiculousAlternativeAnalysis: {
            alternatives: [],
            boundaryIdentificationEffectiveness: 0.8,
            solutionSpaceClarification: {
              clarityImprovement: 0.7,
              boundaryPrecision: 0.8,
              constraintSpecificity: 0.8
            }
          },
          solutionSpaceMapping: {
            validRegions: [],
            invalidRegions: [],
            boundaries: [],
            optimalSolutions: []
          },
          boundaryViolations: []
        },
        bias: {
          biasAssessment: {
            identifiedBiases: [],
            biasImpactAssessment: {
              overallImpact: 0.2,
              individualImpacts: [],
              cumulativeEffects: []
            },
            mitigationStrategies: [],
            systematicBiasNecessity: {
              necessary: false,
              justification: 'No systematic bias detected',
              alternatives: []
            }
          },
          taskDecompositionAnalysis: {
            decomposedTasks: [],
            taskImportance: [],
            completionStatus: {
              completedTasks: 1,
              totalTasks: 1,
              completionRate: 1.0,
              qualityScore: 0.8
            },
            resourceAllocationEfficiency: 0.8
          },
          importanceWeighting: {
            taskPriorities: [],
            selectionCriteriaEffectiveness: 0.8,
            coverageAnalysis: {
              totalCoverage: 0.8,
              criticalAreaCoverage: 0.8,
              uncoveredAreas: [],
              coverageQuality: 0.8
            },
            efficiencyMetrics: {
              timeEfficiency: 0.8,
              resourceEfficiency: 0.8,
              qualityEfficiency: 0.8,
              costEfficiency: 0.8
            }
          },
          processingEfficiency: {
            timeUtilization: 0.8,
            resourceUtilization: 0.8,
            qualityAchievement: 0.8,
            costEffectiveness: 0.8
          },
          terminationCriteriaAnalysis: {
            criteriamet: true,
            reasonForTermination: 'Standard parsing completed',
            remainingTasks: [],
            efficiency: 0.8
          }
        },
        format: {
          passed: true,
          issues: [],
          score: 85,
          styleCompliance: 0.85
        },
        accuracy: {
          passed: true,
          issues: [],
          score: 80,
          factualAccuracy: 0.8
        },
        timestamp: new Date(),
        confidence: match.confidence
      },
      quality: {
        overall: Math.round(match.confidence * 100),
        dimensions: {
          relevance: 80,
          credibility: 75,
          recency: 70,
          accessibility: 85,
          completeness: 80,
          format: 85,
          integration: 75
        },
        trends: {
          recentScores: [Math.round(match.confidence * 100)],
          trendDirection: 'stable',
          improvement: 0
        },
        recommendations: [],
        metadata: {
          assessmentDate: new Date(),
          assessmentMethod: 'parsing',
          confidence: match.confidence,
          modelsUsed: ['citation-parser'],
          version: '1.0'
        }
      },
      source,
      metadata: {
        created: new Date(),
        modified: new Date(),
        processingHistory: [],
        sourceDocument: {
          path: document.fileName,
          type: context.documentType,
          targetStyle: match.style
        },
        userInteractions: [],
        version: '1.0'
      }
    };
  }

  // Additional parsing methods for different citation styles...

  private async parseAPACitation(text: string): Promise<StructuredCitation> {
    // Basic APA parsing logic
    const authors = this.extractAuthors(text);
    const year = this.extractYear(text);
    const title = this.extractTitle(text);
    
    return {
      authors,
      title: title || '',
      date: { year: year || new Date().getFullYear() },
      containerTitle: this.extractJournal(text),
      publisher: this.extractPublisher(text),
      pages: this.extractPages(text),
      doi: this.extractDOI(text),
      url: this.extractURL(text)
    };
  }

  private async parseMLACitation(text: string): Promise<StructuredCitation> {
    // Basic MLA parsing - similar structure
    return this.parseAPACitation(text);
  }

  private async parseChicagoCitation(text: string): Promise<StructuredCitation> {
    // Basic Chicago parsing - similar structure  
    return this.parseAPACitation(text);
  }

  private async parseIEEECitation(text: string): Promise<StructuredCitation> {
    // Basic IEEE parsing - similar structure
    return this.parseAPACitation(text);
  }

  private async parseGenericCitation(text: string): Promise<StructuredCitation> {
    // Fallback generic parsing
    return {
      authors: [{ name: 'Unknown Author' }],
      title: text.substring(0, 50) + '...',
      date: { year: new Date().getFullYear() }
    };
  }

  // Helper methods for parsing...
  
  private extractAuthors(text: string): Author[] {
    // Simple author extraction
    const authorMatch = text.match(/^([^.(]+)/);
    if (authorMatch) {
      const authorText = authorMatch[1].trim();
      if (authorText.includes(' & ') || authorText.includes(' and ')) {
        return authorText.split(/\s*(?:&|and)\s*/).map(name => ({ name: name.trim() }));
      }
      return [{ name: authorText }];
    }
    return [{ name: 'Unknown Author' }];
  }

  private extractYear(text: string): number | undefined {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0], 10) : undefined;
  }

  private extractTitle(text: string): string | undefined {
    const titleMatch = text.match(/"([^"]+)"|'([^']+)'|Title:\s*([^.]+)/);
    return titleMatch ? (titleMatch[1] || titleMatch[2] || titleMatch[3])?.trim() : undefined;
  }

  private extractJournal(text: string): string | undefined {
    const journalMatch = text.match(/(?:Journal of|Proceedings of|In)\s+([^,.\d]+)/i);
    return journalMatch ? journalMatch[1].trim() : undefined;
  }

  private extractPublisher(text: string): Publisher | undefined {
    const publisherMatch = text.match(/(?:Publisher:|Published by)\s*([^,.\d]+)/i);
    if (publisherMatch) {
      return { name: publisherMatch[1].trim() };
    }
    return undefined;
  }

  private extractPages(text: string): PageRange | undefined {
    const pageMatch = text.match(/pp?\.\s*(\d+)(?:-(\d+))?/);
    if (pageMatch) {
      return {
        start: pageMatch[1],
        end: pageMatch[2]
      };
    }
    return undefined;
  }

  private extractDOI(text: string): string | undefined {
    const doiMatch = text.match(/doi:\s*(10\.\d+\/[^\s]+)/i);
    return doiMatch ? doiMatch[1] : undefined;
  }

  private extractURL(text: string): string | undefined {
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    return urlMatch ? urlMatch[1] : undefined;
  }

  // Additional helper methods...

  private generateCitationId(): string {
    return `citation_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateMatchConfidence(text: string, type: string): number {
    let confidence = 0.5; // Base confidence
    
    if (type === 'in-text') {
      if (/\d{4}/.test(text)) confidence += 0.2; // Contains year
      if (/et\s+al\./.test(text)) confidence += 0.1; // Contains "et al."
      if (text.length > 10) confidence += 0.1; // Reasonable length
    } else if (type === 'bibliography') {
      if (/\d{4}/.test(text)) confidence += 0.2; // Contains year
      if (/"[^"]+"|'[^']+'/.test(text)) confidence += 0.1; // Contains quoted title
      if (text.length > 50) confidence += 0.1; // Substantial length
    }
    
    return Math.min(0.95, confidence);
  }

  private isSectionHeader(line: string): boolean {
    return /^#+\s+|^\d+\.?\s+|^[A-Z][A-Z\s]+$/.test(line.trim());
  }

  private cleanSectionTitle(line: string): string {
    return line.replace(/^#+\s*|\d+\.?\s*/, '').trim();
  }

  private classifySectionType(line: string): string {
    const title = this.cleanSectionTitle(line).toLowerCase();
    if (title.includes('reference') || title.includes('bibliograph')) return 'references';
    if (title.includes('introduction') || title.includes('background')) return 'introduction';
    if (title.includes('method') || title.includes('approach')) return 'methods';
    if (title.includes('result') || title.includes('finding')) return 'results';
    if (title.includes('discussion') || title.includes('analysis')) return 'discussion';
    if (title.includes('conclusion')) return 'conclusion';
    return 'other';
  }

  private isMedicalContext(text: string): boolean {
    const medicalKeywords = ['patient', 'clinical', 'medical', 'health', 'disease', 'treatment'];
    return medicalKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private createCitationContent(rawText: string, structured: StructuredCitation): CitationContent {
    return {
      rawText,
      structured,
      formatted: this.createFormattedCitation(structured, 'APA'),
      inText: {
        key: this.generateCitationKey(structured),
        mode: 'parenthetical'
      },
      bibliography: {
        formatted: rawText,
        sortKey: structured.authors[0]?.name || '',
        entryType: 'article'
      }
    };
  }

  private createFormattedCitation(structured: StructuredCitation, style: CitationStyle): FormattedCitation {
    const authorText = structured.authors.map(a => a.name).join(', ');
    const year = structured.date.year?.toString() || '';
    
    return {
      style,
      inText: {
        narrative: `${authorText} (${year})`,
        parenthetical: `(${authorText}, ${year})`,
        authorOnly: authorText,
        yearOnly: year
      },
      bibliography: `${authorText}. (${year}). ${structured.title}.`,
      html: {
        inText: `(${authorText}, ${year})`,
        bibliography: `${authorText}. (${year}). ${structured.title}.`
      },
      latex: {
        inText: `\\cite{${this.generateCitationKey(structured)}}`,
        bibliography: `${authorText}. (${year}). ${structured.title}.`
      }
    };
  }

  private generateCitationKey(structured: StructuredCitation): string {
    const author = structured.authors[0]?.name.split(' ').pop() || 'Unknown';
    const year = structured.date.year || new Date().getFullYear();
    return `${author}${year}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private createCitationContext(
    match: CitationMatch, 
    context: ParsingContext, 
    document: vscode.TextDocument
  ): CitationContext {
    const position = document.positionAt(match.start);
    
    return {
      position: {
        line: position.line,
        character: position.character,
        paragraph: this.calculateParagraphNumber(context.documentText, match.start),
        section: {
          title: 'Main',
          type: 'other',
          level: 1,
          number: '1'
        },
        range: {
          start: position,
          end: document.positionAt(match.end)
        }
      },
      argumentative: {
        claim: this.extractSurroundingClaim(context.documentText, match),
        supportType: 'empirical-evidence',
        supportStrength: 0.8,
        surroundingClaims: [],
        logicalRelation: 'supports'
      },
      semantic: {
        semanticRole: 'evidence',
        topicAlignment: 0.8,
        conceptualRelevance: 0.8,
        terminologyAlignment: 0.8
      },
      intent: {
        inferredIntent: 'provide-evidence',
        intentConfidence: 0.8,
        userGoals: [],
        purposeAlignment: 0.8
      },
      environmental: {
        writingContext: 'academic',
        temporalContext: new Date(),
        cognitiveLoad: 0.5,
        focusLevel: 0.8
      }
    };
  }

  private createCitationSource(structured: StructuredCitation, context: ParsingContext): CitationSource {
    return {
      type: 'journal-article',
      domain: 'interdisciplinary',
      impact: {
        impactFactor: 2.5,
        citationCount: 100,
        authorHIndex: [15],
        altmetricScore: 25
      },
      credibility: {
        score: 85,
        peerReviewed: true,
        publisherReputation: 0.9,
        authorExpertise: 0.8,
        conflictsOfInterest: [],
        retracted: false
      },
      access: {
        openAccess: false,
        accessibilityScore: 0.7,
        availability: 'subscription'
      }
    };
  }

  private calculateParagraphNumber(text: string, position: number): number {
    const beforePosition = text.substring(0, position);
    return beforePosition.split(/\n\s*\n/).length;
  }

  private extractSurroundingClaim(text: string, match: CitationMatch): string {
    const start = Math.max(0, match.start - 200);
    const end = Math.min(text.length, match.end + 200);
    return text.substring(start, end).trim();
  }

  private async validateCitations(citations: Citation[]): Promise<Citation[]> {
    // Basic validation - remove duplicates and invalid citations
    const seen = new Set<string>();
    return citations.filter(citation => {
      const key = citation.content.rawText.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return citation.content.rawText.length > this.config.minCitationLength;
    });
  }

  private createFallbackStructuredCitation(text: string): StructuredCitation {
    return {
      authors: [{ name: 'Unknown Author' }],
      title: text.substring(0, 100),
      date: { year: new Date().getFullYear() }
    };
  }
}
