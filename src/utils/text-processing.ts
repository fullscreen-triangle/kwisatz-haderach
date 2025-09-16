/**
 * Text Processing utility for the Kwisatz-Haderach Citation Intelligence Framework
 * 
 * Provides text cleaning, normalization, and analysis functions for academic documents.
 */

import { Logger } from './logging.js';

/**
 * Text processing configuration
 */
interface TextProcessingConfig {
  /** Remove extra whitespace */
  normalizeWhitespace: boolean;
  
  /** Normalize quotation marks */
  normalizeQuotes: boolean;
  
  /** Remove excessive line breaks */
  removeExcessiveLineBreaks: boolean;
  
  /** Convert to lowercase for analysis */
  lowercaseForAnalysis: boolean;
  
  /** Remove special characters */
  removeSpecialChars: boolean;
  
  /** Maximum line length */
  maxLineLength: number;
}

/**
 * Text analysis result
 */
export interface TextAnalysisResult {
  /** Word count */
  wordCount: number;
  
  /** Character count */
  characterCount: number;
  
  /** Line count */
  lineCount: number;
  
  /** Paragraph count */
  paragraphCount: number;
  
  /** Average words per sentence */
  averageWordsPerSentence: number;
  
  /** Reading time estimate (minutes) */
  readingTimeMinutes: number;
  
  /** Language detection */
  detectedLanguage: string;
  
  /** Readability score */
  readabilityScore: number;
}

/**
 * Sentence structure
 */
export interface SentenceInfo {
  /** Sentence text */
  text: string;
  
  /** Start position */
  startPos: number;
  
  /** End position */
  endPos: number;
  
  /** Word count */
  wordCount: number;
  
  /** Contains citation */
  containsCitation: boolean;
  
  /** Sentence type */
  type: 'declarative' | 'interrogative' | 'imperative' | 'exclamatory';
}

/**
 * Text Processing utility implementation
 */
export class TextProcessor {
  private readonly logger: Logger;
  private config: TextProcessingConfig;

  constructor() {
    this.logger = Logger.getInstance();
    
    // Default configuration
    this.config = {
      normalizeWhitespace: true,
      normalizeQuotes: true,
      removeExcessiveLineBreaks: true,
      lowercaseForAnalysis: false,
      removeSpecialChars: false,
      maxLineLength: 120
    };
  }

  /**
   * Initialize text processor
   */
  async initialize(): Promise<void> {
    this.logger.info('🔤 Initializing Text Processor...');
    // Any initialization logic would go here
    this.logger.info('✅ Text Processor initialized');
  }

  /**
   * Normalize whitespace in text
   */
  async normalizeWhitespace(text: string): Promise<string> {
    if (!this.config.normalizeWhitespace) return text;

    return text
      // Replace multiple spaces with single space
      .replace(/[ \t]+/g, ' ')
      // Replace multiple tabs with single space
      .replace(/\t+/g, ' ')
      // Replace space at start/end of lines
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      // Replace multiple spaces around punctuation
      .replace(/\s*([,;:.])\s*/g, '$1 ')
      .replace(/\s*([!?])\s*/g, '$1 ')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Remove excessive line breaks
   */
  async removeExcessiveLineBreaks(text: string): Promise<string> {
    if (!this.config.removeExcessiveLineBreaks) return text;

    return text
      // Replace 3+ consecutive newlines with 2 newlines
      .replace(/\n{3,}/g, '\n\n')
      // Replace carriage return + newline combinations
      .replace(/\r\n/g, '\n')
      // Replace lone carriage returns
      .replace(/\r/g, '\n')
      // Clean up trailing whitespace on lines
      .replace(/[ \t]+$/gm, '');
  }

  /**
   * Normalize quotation marks
   */
  async normalizeQuotes(text: string): Promise<string> {
    if (!this.config.normalizeQuotes) return text;

    return text
      // Replace smart quotes with straight quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Replace other quote-like characters
      .replace(/[`´]/g, "'")
      .replace(/[‚„]/g, ',')
      // Replace em/en dashes with hyphens in appropriate contexts
      .replace(/([a-zA-Z])—([a-zA-Z])/g, '$1-$2')
      .replace(/([a-zA-Z])–([a-zA-Z])/g, '$1-$2');
  }

  /**
   * Clean text for analysis
   */
  async cleanForAnalysis(text: string): Promise<string> {
    let cleaned = text;

    // Apply all enabled normalizations
    cleaned = await this.normalizeWhitespace(cleaned);
    cleaned = await this.removeExcessiveLineBreaks(cleaned);
    cleaned = await this.normalizeQuotes(cleaned);

    // Remove special characters if configured
    if (this.config.removeSpecialChars) {
      cleaned = cleaned.replace(/[^\w\s\-.,!?;:()\[\]"']/g, '');
    }

    // Convert to lowercase if configured
    if (this.config.lowercaseForAnalysis) {
      cleaned = cleaned.toLowerCase();
    }

    return cleaned.trim();
  }

  /**
   * Extract sentences from text
   */
  async extractSentences(text: string): Promise<SentenceInfo[]> {
    const sentences: SentenceInfo[] = [];
    
    // Simple sentence splitting (improved version would use NLP)
    const sentenceRegex = /[.!?]+(?:\s|$)/g;
    let lastEnd = 0;
    let match;

    while ((match = sentenceRegex.exec(text)) !== null) {
      const sentenceText = text.substring(lastEnd, match.index + match[0].length).trim();
      
      if (sentenceText.length > 0) {
        sentences.push({
          text: sentenceText,
          startPos: lastEnd,
          endPos: match.index + match[0].length,
          wordCount: this.countWords(sentenceText),
          containsCitation: this.containsCitation(sentenceText),
          type: this.classifySentenceType(sentenceText)
        });
      }
      
      lastEnd = match.index + match[0].length;
    }

    // Handle remaining text if no final punctuation
    if (lastEnd < text.length) {
      const remainingText = text.substring(lastEnd).trim();
      if (remainingText.length > 0) {
        sentences.push({
          text: remainingText,
          startPos: lastEnd,
          endPos: text.length,
          wordCount: this.countWords(remainingText),
          containsCitation: this.containsCitation(remainingText),
          type: 'declarative'
        });
      }
    }

    return sentences;
  }

  /**
   * Extract paragraphs from text
   */
  async extractParagraphs(text: string): Promise<string[]> {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Analyze text statistics
   */
  async analyzeText(text: string): Promise<TextAnalysisResult> {
    const sentences = await this.extractSentences(text);
    const paragraphs = await this.extractParagraphs(text);
    const words = this.extractWords(text);
    
    const wordCount = words.length;
    const characterCount = text.length;
    const lineCount = text.split('\n').length;
    const paragraphCount = paragraphs.length;
    
    const averageWordsPerSentence = sentences.length > 0 
      ? wordCount / sentences.length 
      : 0;
    
    // Estimate reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(wordCount / 200);
    
    const detectedLanguage = this.detectLanguage(text);
    const readabilityScore = this.calculateReadabilityScore(text, sentences, words);

    return {
      wordCount,
      characterCount,
      lineCount,
      paragraphCount,
      averageWordsPerSentence,
      readingTimeMinutes,
      detectedLanguage,
      readabilityScore
    };
  }

  /**
   * Extract key terms from text
   */
  async extractKeyTerms(text: string, maxTerms: number = 20): Promise<string[]> {
    const words = this.extractWords(text.toLowerCase());
    
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'shall', 'from', 'into', 'onto', 'upon', 'about', 'over',
      'under', 'above', 'below', 'between', 'among', 'through', 'during', 'before', 'after',
      'while', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose'
    ]);

    // Count word frequencies
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // Sort by frequency and return top terms
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTerms)
      .map(entry => entry[0]);
  }

  /**
   * Find text patterns using regex
   */
  async findPatterns(text: string, patterns: Record<string, RegExp>): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};

    for (const [name, pattern] of Object.entries(patterns)) {
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      results[name] = matches || [];
    }

    return results;
  }

  /**
   * Calculate text similarity using simple approach
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const words1 = new Set(this.extractWords(text1.toLowerCase()));
    const words2 = new Set(this.extractWords(text2.toLowerCase()));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // ========== Private Helper Methods ==========

  /**
   * Extract words from text
   */
  private extractWords(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return this.extractWords(text).length;
  }

  /**
   * Check if text contains citation patterns
   */
  private containsCitation(text: string): boolean {
    const citationPatterns = [
      /\([^)]*\d{4}[^)]*\)/,  // (Author, 2023)
      /\[[^\]]*\d+[^\]]*\]/,  // [1], [Author 2023]
      /\b\w+\s+et\s+al\./,    // Author et al.
      /\b\w+\s+\(\d{4}\)/,    // Author (2023)
      /\b\d{4}\b.*\bp\.\s*\d+/ // 2023, p. 123
    ];

    return citationPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Classify sentence type
   */
  private classifySentenceType(sentence: string): SentenceInfo['type'] {
    const trimmed = sentence.trim();
    
    if (trimmed.endsWith('?')) return 'interrogative';
    if (trimmed.endsWith('!')) return 'exclamatory';
    
    // Simple heuristics for imperative sentences
    const imperativeStarters = ['do', 'don\'t', 'please', 'let', 'make', 'take', 'give'];
    const firstWord = trimmed.split(' ')[0]?.toLowerCase();
    if (imperativeStarters.includes(firstWord)) return 'imperative';
    
    return 'declarative';
  }

  /**
   * Simple language detection
   */
  private detectLanguage(text: string): string {
    // Very basic language detection using common words
    const englishWords = ['the', 'and', 'is', 'to', 'of', 'in', 'that', 'have', 'for', 'not'];
    const words = this.extractWords(text.toLowerCase());
    
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    const englishRatio = englishCount / Math.min(words.length, 100);
    
    return englishRatio > 0.1 ? 'en' : 'unknown';
  }

  /**
   * Calculate basic readability score
   */
  private calculateReadabilityScore(text: string, sentences: SentenceInfo[], words: string[]): number {
    if (sentences.length === 0 || words.length === 0) return 0;

    // Simple Flesch-like readability calculation
    const averageWordsPerSentence = words.length / sentences.length;
    const averageSyllablesPerWord = words.reduce((sum, word) => sum + this.countSyllables(word), 0) / words.length;
    
    // Simplified Flesch formula
    const score = 206.835 - (1.015 * averageWordsPerSentence) - (84.6 * averageSyllablesPerWord);
    
    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in a word (approximation)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? Math.max(1, matches.length) : 1;
  }
}
