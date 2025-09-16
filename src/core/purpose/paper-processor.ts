/**
 * Paper Processor for the Purpose Framework
 * 
 * This component processes academic papers to extract content, structure,
 * citations, and metadata for domain-specific LLM training.
 */

import * as vscode from 'vscode';
import type { 
  Citation, 
  CitationContent,
  StructuredCitation,
  DocumentInfo,
  AcademicDomain,
  CitationSourceType
} from '@/types/citations.js';
import type { ModelConfig } from '@/types/models.js';
import { Logger } from '@/utils/logging.js';
import { TextProcessor } from '@/utils/text-processing.js';
import { CitationParser } from '@/utils/citation-parsers.js';

/**
 * Paper processing result
 */
export interface PaperProcessingResult {
  /** Processed document information */
  document: ProcessedDocument;
  
  /** Extracted citations */
  citations: Citation[];
  
  /** Document structure */
  structure: DocumentStructure;
  
  /** Processing metadata */
  metadata: ProcessingMetadata;
  
  /** Domain classification */
  domain: AcademicDomain;
  
  /** Quality assessment */
  quality: DocumentQuality;
}

/**
 * Processed document representation
 */
export interface ProcessedDocument {
  /** Document identifier */
  id: string;
  
  /** Original content */
  originalContent: string;
  
  /** Cleaned and normalized content */
  cleanedContent: string;
  
  /** Structured content sections */
  sections: DocumentSection[];
  
  /** Document metadata */
  metadata: DocumentMetadata;
  
  /** Citation contexts */
  citationContexts: CitationContextMapping[];
  
  /** Argumentative structure */
  argumentativeStructure: ArgumentativeStructure;
}

/**
 * Document structure analysis
 */
export interface DocumentStructure {
  /** Document type */
  type: DocumentType;
  
  /** Section hierarchy */
  sectionHierarchy: SectionHierarchy;
  
  /** Citation distribution */
  citationDistribution: CitationDistribution;
  
  /** Argumentation flow */
  argumentationFlow: ArgumentationFlow;
  
  /** Knowledge structure */
  knowledgeStructure: KnowledgeStructure;
}

/**
 * Document types
 */
export type DocumentType = 
  | 'research-article'
  | 'review-article'
  | 'book-chapter'
  | 'thesis'
  | 'conference-paper'
  | 'working-paper'
  | 'report'
  | 'book'
  | 'other';

/**
 * Paper processor implementation
 */
export class PaperProcessor {
  private readonly logger: Logger;
  private readonly textProcessor: TextProcessor;
  private readonly citationParser: CitationParser;

  constructor() {
    this.logger = Logger.getInstance();
    this.textProcessor = new TextProcessor();
    this.citationParser = new CitationParser();
  }

  /**
   * Process a document for Purpose Framework training
   */
  async processDocument(document: vscode.TextDocument): Promise<PaperProcessingResult> {
    this.logger.info(`📄 Processing document: ${document.fileName}`);
    
    const processingStart = performance.now();
    
    try {
      // Extract and clean content
      const cleanedContent = await this.extractAndCleanContent(document);
      
      // Analyze document structure
      const structure = await this.analyzeDocumentStructure(cleanedContent, document);
      
      // Extract citations
      const citations = await this.extractCitations(cleanedContent, document);
      
      // Classify academic domain
      const domain = await this.classifyDomain(cleanedContent, citations);
      
      // Create processed document
      const processedDocument = await this.createProcessedDocument(
        document, 
        cleanedContent, 
        structure, 
        citations,
        domain
      );
      
      // Assess document quality
      const quality = await this.assessDocumentQuality(processedDocument, citations);
      
      // Create processing metadata
      const metadata = this.createProcessingMetadata(
        document,
        processingStart,
        performance.now()
      );
      
      const result: PaperProcessingResult = {
        document: processedDocument,
        citations,
        structure,
        metadata,
        domain,
        quality
      };
      
      this.logger.info(`✅ Document processed successfully in ${(performance.now() - processingStart).toFixed(2)}ms`);
      
      return result;
      
    } catch (error) {
      this.logger.error('Error processing document:', error);
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract and clean document content
   */
  private async extractAndCleanContent(document: vscode.TextDocument): Promise<string> {
    let content = document.getText();
    
    // Determine document format
    const format = this.detectDocumentFormat(document);
    
    // Format-specific cleaning
    switch (format) {
      case 'latex':
        content = await this.cleanLatexContent(content);
        break;
      case 'markdown':
        content = await this.cleanMarkdownContent(content);
        break;
      case 'plaintext':
        content = await this.cleanPlaintextContent(content);
        break;
      default:
        content = await this.cleanGenericContent(content);
    }
    
    // Generic text cleaning
    content = await this.textProcessor.normalizeWhitespace(content);
    content = await this.textProcessor.removeExcessiveLineBreaks(content);
    content = await this.textProcessor.normalizeQuotes(content);
    
    return content;
  }

  /**
   * Detect document format
   */
  private detectDocumentFormat(document: vscode.TextDocument): 'latex' | 'markdown' | 'plaintext' | 'other' {
    const fileName = document.fileName.toLowerCase();
    const content = document.getText();
    
    if (fileName.endsWith('.tex') || content.includes('\\documentclass') || content.includes('\\begin{document}')) {
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
   * Clean LaTeX content
   */
  private async cleanLatexContent(content: string): Promise<string> {
    // Remove LaTeX commands but preserve structure
    content = content
      // Remove comment lines
      .replace(/^%.*$/gm, '')
      // Remove common formatting commands
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\textit\{([^}]+)\}/g, '$1')
      .replace(/\\emph\{([^}]+)\}/g, '$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      // Clean up section commands but preserve structure
      .replace(/\\(sub)*section\*?\{([^}]+)\}/g, (match, sub, title) => {
        const level = sub ? (sub.length / 3) + 1 : 1;
        return '\n'.repeat(level) + title + '\n'.repeat(level);
      })
      // Remove equation environments but preserve content
      .replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, '$1')
      .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, '$1')
      // Remove figure and table environments
      .replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, '')
      .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, '')
      // Clean up remaining LaTeX artifacts
      .replace(/\\[a-zA-Z]+(\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\$\$?([^$]+)\$\$?/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '');
    
    return content;
  }

  /**
   * Clean Markdown content
   */
  private async cleanMarkdownContent(content: string): Promise<string> {
    // Clean Markdown syntax while preserving structure
    content = content
      // Remove image references
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Convert links to just text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove emphasis markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Convert headers to plain text with structure
      .replace(/^#+\s*(.+)$/gm, (match, title) => {
        const level = match.indexOf(' ');
        return '\n'.repeat(level) + title + '\n'.repeat(level);
      })
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Clean up lists
      .replace(/^\s*[-*+]\s+/gm, '');
    
    return content;
  }

  /**
   * Clean plaintext content
   */
  private async cleanPlaintextContent(content: string): Promise<string> {
    // Minimal cleaning for plaintext
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .trim();
  }

  /**
   * Generic content cleaning
   */
  private async cleanGenericContent(content: string): Promise<string> {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .trim();
  }

  /**
   * Analyze document structure
   */
  private async analyzeDocumentStructure(content: string, document: vscode.TextDocument): Promise<DocumentStructure> {
    const sections = await this.extractSections(content);
    const sectionHierarchy = this.buildSectionHierarchy(sections);
    const citationDistribution = await this.analyzeCitationDistribution(content);
    const argumentationFlow = await this.analyzeArgumentationFlow(sections);
    const knowledgeStructure = await this.analyzeKnowledgeStructure(content, sections);
    
    const documentType = this.classifyDocumentType(content, document);
    
    return {
      type: documentType,
      sectionHierarchy,
      citationDistribution,
      argumentationFlow,
      knowledgeStructure
    };
  }

  /**
   * Extract document sections
   */
  private async extractSections(content: string): Promise<DocumentSection[]> {
    const sections: DocumentSection[] = [];
    const lines = content.split('\n');
    
    let currentSection: DocumentSection | null = null;
    let sectionContent = '';
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Check if line is a section header
      const sectionMatch = this.identifySectionHeader(line);
      
      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = sectionContent.trim();
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          id: `section_${sections.length + 1}`,
          title: sectionMatch.title,
          level: sectionMatch.level,
          type: this.classifySectionType(sectionMatch.title),
          startLine: lineNumber,
          endLine: lineNumber,
          content: '',
          subsections: [],
          citations: [],
          wordCount: 0
        };
        
        sectionContent = '';
      } else if (currentSection) {
        sectionContent += line + '\n';
        currentSection.endLine = lineNumber;
      } else {
        // Content before first section
        if (!currentSection) {
          currentSection = {
            id: 'section_0',
            title: 'Introduction',
            level: 1,
            type: 'introduction',
            startLine: 1,
            endLine: lineNumber,
            content: '',
            subsections: [],
            citations: [],
            wordCount: 0
          };
        }
        sectionContent += line + '\n';
      }
    }
    
    // Add final section
    if (currentSection) {
      currentSection.content = sectionContent.trim();
      currentSection.wordCount = this.countWords(currentSection.content);
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Identify section headers in content
   */
  private identifySectionHeader(line: string): { title: string; level: number } | null {
    // Common section header patterns
    const patterns = [
      /^#+\s*(.+)$/, // Markdown headers
      /^(\d+\.?\s*)+(.+)$/, // Numbered sections
      /^([A-Z][A-Z\s]+)$/, // All caps headers
      /^(.{1,50})\s*$/ // Short lines that might be headers
    ];
    
    const trimmedLine = line.trim();
    
    if (trimmedLine.length < 3 || trimmedLine.length > 100) {
      return null;
    }
    
    // Check for Markdown headers
    const markdownMatch = trimmedLine.match(/^(#+)\s*(.+)$/);
    if (markdownMatch) {
      return {
        title: markdownMatch[2].trim(),
        level: markdownMatch[1].length
      };
    }
    
    // Check for numbered sections
    const numberedMatch = trimmedLine.match(/^(\d+\.?\s*)+(.+)$/);
    if (numberedMatch) {
      const level = (numberedMatch[1].match(/\d+/g) || []).length;
      return {
        title: numberedMatch[2].trim(),
        level: Math.min(level, 5)
      };
    }
    
    // Check for all caps (potential section headers)
    if (/^[A-Z][A-Z\s\-\:\?]+$/.test(trimmedLine) && trimmedLine.length > 3) {
      return {
        title: trimmedLine,
        level: 1
      };
    }
    
    return null;
  }

  /**
   * Classify section type based on title
   */
  private classifySectionType(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('abstract')) return 'abstract';
    if (titleLower.includes('introduction') || titleLower.includes('background')) return 'introduction';
    if (titleLower.includes('method') || titleLower.includes('approach')) return 'methods';
    if (titleLower.includes('result') || titleLower.includes('finding')) return 'results';
    if (titleLower.includes('discussion') || titleLower.includes('analysis')) return 'discussion';
    if (titleLower.includes('conclusion') || titleLower.includes('summary')) return 'conclusion';
    if (titleLower.includes('reference') || titleLower.includes('bibliograph')) return 'references';
    if (titleLower.includes('appendix')) return 'appendix';
    
    return 'other';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract citations from content
   */
  private async extractCitations(content: string, document: vscode.TextDocument): Promise<Citation[]> {
    return await this.citationParser.extractCitations(content, document);
  }

  /**
   * Classify academic domain
   */
  private async classifyDomain(content: string, citations: Citation[]): Promise<AcademicDomain> {
    // Use simple keyword-based classification for now
    // This would be replaced with a ML model later
    
    const contentLower = content.toLowerCase();
    const keywords = {
      'medical': ['patient', 'clinical', 'medical', 'health', 'disease', 'treatment', 'therapy'],
      'computer-science': ['algorithm', 'computer', 'software', 'system', 'programming', 'data'],
      'physics': ['physics', 'quantum', 'particle', 'energy', 'force', 'matter'],
      'biology': ['cell', 'organism', 'gene', 'protein', 'species', 'evolution'],
      'psychology': ['behavior', 'cognitive', 'mental', 'psychological', 'brain', 'mind'],
      'economics': ['economic', 'market', 'price', 'trade', 'financial', 'cost'],
      'legal': ['legal', 'law', 'court', 'case', 'statute', 'contract'],
      'history': ['historical', 'century', 'war', 'culture', 'society', 'period']
    };
    
    const scores: Record<string, number> = {};
    
    for (const [domain, domainKeywords] of Object.entries(keywords)) {
      scores[domain] = domainKeywords.reduce((score, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = contentLower.match(regex);
        return score + (matches ? matches.length : 0);
      }, 0);
    }
    
    const topDomain = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    
    return (topDomain as AcademicDomain) || 'interdisciplinary';
  }

  /**
   * Create processed document
   */
  private async createProcessedDocument(
    document: vscode.TextDocument,
    cleanedContent: string,
    structure: DocumentStructure,
    citations: Citation[],
    domain: AcademicDomain
  ): Promise<ProcessedDocument> {
    const documentId = this.generateDocumentId(document);
    const sections = await this.extractSections(cleanedContent);
    const citationContexts = this.mapCitationContexts(citations, sections);
    const argumentativeStructure = await this.analyzeArgumentativeStructure(cleanedContent, citations);
    
    return {
      id: documentId,
      originalContent: document.getText(),
      cleanedContent,
      sections,
      metadata: {
        fileName: document.fileName,
        fileSize: document.getText().length,
        language: document.languageId,
        domain,
        createdAt: new Date(),
        wordCount: this.countWords(cleanedContent),
        citationCount: citations.length
      },
      citationContexts,
      argumentativeStructure
    };
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(document: vscode.TextDocument): string {
    const fileName = document.fileName.split('/').pop() || 'unknown';
    const timestamp = Date.now().toString(36);
    const hash = this.simpleHash(document.getText()).toString(36);
    return `doc_${fileName}_${timestamp}_${hash}`;
  }

  /**
   * Simple hash function for content
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Additional methods would be implemented here...
  private buildSectionHierarchy(_sections: DocumentSection[]): SectionHierarchy {
    // Implementation placeholder
    return {
      rootSections: [],
      maxDepth: 1,
      totalSections: 0
    };
  }

  private async analyzeCitationDistribution(_content: string): Promise<CitationDistribution> {
    // Implementation placeholder
    return {
      totalCitations: 0,
      citationsBySection: {},
      averageCitationsPerSection: 0,
      citationDensity: 0
    };
  }

  private async analyzeArgumentationFlow(_sections: DocumentSection[]): Promise<ArgumentationFlow> {
    // Implementation placeholder
    return {
      argumentChains: [],
      claimEvidenceRelations: [],
      logicalStructure: 'linear'
    };
  }

  private async analyzeKnowledgeStructure(_content: string, _sections: DocumentSection[]): Promise<KnowledgeStructure> {
    // Implementation placeholder
    return {
      conceptMap: {},
      keyTerms: [],
      knowledgeDomains: []
    };
  }

  private classifyDocumentType(_content: string, _document: vscode.TextDocument): DocumentType {
    // Implementation placeholder - would analyze structure and content
    return 'research-article';
  }

  private mapCitationContexts(_citations: Citation[], _sections: DocumentSection[]): CitationContextMapping[] {
    // Implementation placeholder
    return [];
  }

  private async analyzeArgumentativeStructure(_content: string, _citations: Citation[]): Promise<ArgumentativeStructure> {
    // Implementation placeholder
    return {
      mainClaims: [],
      supportingEvidence: [],
      counterArguments: [],
      logicalConnections: []
    };
  }

  private async assessDocumentQuality(_document: ProcessedDocument, _citations: Citation[]): Promise<DocumentQuality> {
    // Implementation placeholder
    return {
      overallScore: 75,
      structureQuality: 80,
      citationQuality: 70,
      contentQuality: 75,
      issues: []
    };
  }

  private createProcessingMetadata(
    document: vscode.TextDocument,
    startTime: number,
    endTime: number
  ): ProcessingMetadata {
    return {
      processingTime: endTime - startTime,
      documentSize: document.getText().length,
      processingDate: new Date(),
      version: '1.0',
      processingSteps: ['content_extraction', 'structure_analysis', 'citation_extraction', 'domain_classification']
    };
  }
}

// ========== Supporting Types ==========

interface DocumentSection {
  id: string;
  title: string;
  level: number;
  type: string;
  startLine: number;
  endLine: number;
  content: string;
  subsections: string[];
  citations: string[];
  wordCount: number;
}

interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  language: string;
  domain: AcademicDomain;
  createdAt: Date;
  wordCount: number;
  citationCount: number;
}

interface CitationContextMapping {
  citationId: string;
  sectionId: string;
  contextText: string;
  position: number;
}

interface ArgumentativeStructure {
  mainClaims: string[];
  supportingEvidence: string[];
  counterArguments: string[];
  logicalConnections: string[];
}

interface ProcessingMetadata {
  processingTime: number;
  documentSize: number;
  processingDate: Date;
  version: string;
  processingSteps: string[];
}

interface SectionHierarchy {
  rootSections: string[];
  maxDepth: number;
  totalSections: number;
}

interface CitationDistribution {
  totalCitations: number;
  citationsBySection: Record<string, number>;
  averageCitationsPerSection: number;
  citationDensity: number;
}

interface ArgumentationFlow {
  argumentChains: string[];
  claimEvidenceRelations: string[];
  logicalStructure: 'linear' | 'hierarchical' | 'networked';
}

interface KnowledgeStructure {
  conceptMap: Record<string, string[]>;
  keyTerms: string[];
  knowledgeDomains: string[];
}

interface DocumentQuality {
  overallScore: number;
  structureQuality: number;
  citationQuality: number;
  contentQuality: number;
  issues: string[];
}
