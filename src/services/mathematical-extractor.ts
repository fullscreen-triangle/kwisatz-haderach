/**
 * Mathematical Statement Extractor
 * 
 * Extracts formal mathematical statements from natural language citations
 * for verification with proof assistants
 */

import type { Citation } from '@/types/citations';
import type {
  MathematicalCitation,
  FormalStatement,
  MathClaim,
  ProofSketch,
  MathStatementType,
  ProofStrategy,
  ComplexityClass,
  Variable
} from '@/types/proof-assistants';
import { Logger } from '@/utils/logging';
import { TextProcessor } from '@/utils/text-processing';

/**
 * Mathematical pattern recognition results
 */
interface MathPattern {
  type: 'theorem' | 'lemma' | 'definition' | 'axiom' | 'equation' | 'inequality' | 'quantifier';
  pattern: string;
  confidence: number;
  location: { start: number; end: number };
  variables: string[];
  context: string;
}

/**
 * Mathematical domain classification
 */
interface DomainClassification {
  primaryDomain: string;
  secondaryDomains: string[];
  confidence: number;
  keywords: string[];
}

/**
 * Mathematical Statement Extractor Service
 */
export class MathematicalExtractor {
  private readonly logger: Logger;
  private readonly textProcessor: TextProcessor;
  
  // Mathematical keyword patterns
  private readonly mathKeywords = {
    theorems: ['theorem', 'lemma', 'corollary', 'proposition', 'result'],
    definitions: ['define', 'definition', 'let', 'denote', 'call'],
    quantifiers: ['for all', 'for every', 'there exists', 'for any', 'for some'],
    logical: ['if and only if', 'iff', 'implies', 'therefore', 'hence', 'thus'],
    proof: ['proof', 'prove', 'show', 'demonstrate', 'establish'],
    relations: ['equal', 'greater', 'less', 'equivalent', 'congruent'],
    operators: ['sum', 'integral', 'derivative', 'limit', 'maximum', 'minimum']
  };

  // Domain-specific patterns
  private readonly domainPatterns = {
    algebra: ['group', 'ring', 'field', 'vector space', 'polynomial', 'matrix'],
    analysis: ['continuous', 'differentiable', 'integrable', 'convergence', 'limit'],
    topology: ['open', 'closed', 'compact', 'connected', 'homeomorphism'],
    'number-theory': ['prime', 'divisible', 'congruence', 'gcd', 'lcm'],
    'set-theory': ['subset', 'union', 'intersection', 'cardinality', 'bijection'],
    logic: ['satisfiable', 'valid', 'consistent', 'complete', 'decidable']
  };

  constructor() {
    this.logger = Logger.getInstance();
    this.textProcessor = new TextProcessor();
  }

  /**
   * Extract mathematical content from a citation
   */
  async extractMathematicalContent(citation: Citation): Promise<MathematicalCitation> {
    this.logger.info('Extracting mathematical content from citation', { 
      citationId: citation.id 
    });

    try {
      // 1. Detect mathematical patterns
      const patterns = this.detectMathematicalPatterns(citation.content);
      
      // 2. Extract formal statements
      const formalStatements = await this.extractFormalStatements(citation.content, patterns);
      
      // 3. Extract mathematical claims
      const mathematicalClaims = this.extractMathematicalClaims(citation.content, patterns);
      
      // 4. Generate proof sketches
      const proofOutlines = this.generateProofSketches(mathematicalClaims, patterns);
      
      // 5. Classify mathematical domains
      const domainClassification = this.classifyMathematicalDomains(citation.content, patterns);
      
      // 6. Analyze complexity
      const complexityAssessment = this.assessComplexity(patterns, formalStatements);
      
      // 7. Determine if formal verification is needed
      const requiresFormalVerification = this.requiresFormalVerification(
        mathematicalClaims,
        complexityAssessment,
        domainClassification
      );

      const mathematicalCitation: MathematicalCitation = {
        ...citation,
        mathematicalClaims,
        formalStatements,
        proofOutlines,
        mathematicalDependencies: this.extractMathematicalDependencies(citation),
        mathematicalDomains: [domainClassification.primaryDomain as any],
        complexityAssessment,
        requiresFormalVerification
      };

      this.logger.info('Mathematical extraction completed', {
        citationId: citation.id,
        claimsFound: mathematicalClaims.length,
        statementsExtracted: formalStatements.length,
        complexity: complexityAssessment
      });

      return mathematicalCitation;

    } catch (error) {
      this.logger.error('Mathematical extraction failed', error);
      
      // Return citation with minimal mathematical content
      return {
        ...citation,
        mathematicalClaims: [],
        formalStatements: [],
        proofOutlines: [],
        mathematicalDependencies: [],
        mathematicalDomains: [],
        complexityAssessment: 'unknown',
        requiresFormalVerification: false
      };
    }
  }

  /**
   * Detect mathematical patterns in text
   */
  private detectMathematicalPatterns(text: string): MathPattern[] {
    const patterns: MathPattern[] = [];
    const words = text.toLowerCase();

    // Detect theorem statements
    for (const keyword of this.mathKeywords.theorems) {
      const regex = new RegExp(`\\b${keyword}\\b[^.]*\\.`, 'gi');
      const matches = Array.from(text.matchAll(regex));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          patterns.push({
            type: 'theorem',
            pattern: match[0],
            confidence: 0.8,
            location: { start: match.index, end: match.index + match[0].length },
            variables: this.extractVariables(match[0]),
            context: this.extractContext(text, match.index, match[0].length)
          });
        }
      }
    }

    // Detect definitions
    for (const keyword of this.mathKeywords.definitions) {
      const regex = new RegExp(`\\b${keyword}\\b[^.]*\\.`, 'gi');
      const matches = Array.from(text.matchAll(regex));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          patterns.push({
            type: 'definition',
            pattern: match[0],
            confidence: 0.7,
            location: { start: match.index, end: match.index + match[0].length },
            variables: this.extractVariables(match[0]),
            context: this.extractContext(text, match.index, match[0].length)
          });
        }
      }
    }

    // Detect quantified statements
    for (const quantifier of this.mathKeywords.quantifiers) {
      const regex = new RegExp(`\\b${quantifier}\\b[^.]*\\.`, 'gi');
      const matches = Array.from(text.matchAll(regex));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          patterns.push({
            type: 'quantifier',
            pattern: match[0],
            confidence: 0.6,
            location: { start: match.index, end: match.index + match[0].length },
            variables: this.extractVariables(match[0]),
            context: this.extractContext(text, match.index, match[0].length)
          });
        }
      }
    }

    // Detect equations and inequalities
    const equationRegex = /[a-zA-Z_]\s*[=<>≤≥≠]\s*[a-zA-Z_0-9\s\+\-\*/\(\)]+/g;
    const equationMatches = Array.from(text.matchAll(equationRegex));
    
    for (const match of equationMatches) {
      if (match.index !== undefined) {
        patterns.push({
          type: match[0].includes('=') ? 'equation' : 'inequality',
          pattern: match[0],
          confidence: 0.9,
          location: { start: match.index, end: match.index + match[0].length },
          variables: this.extractVariables(match[0]),
          context: this.extractContext(text, match.index, match[0].length)
        });
      }
    }

    return patterns;
  }

  /**
   * Extract formal statements from patterns
   */
  private async extractFormalStatements(text: string, patterns: MathPattern[]): Promise<FormalStatement[]> {
    const statements: FormalStatement[] = [];

    for (const pattern of patterns) {
      try {
        const statement: FormalStatement = {
          id: this.generateStatementId(pattern),
          naturalLanguage: pattern.pattern,
          formalRepresentations: new Map(),
          type: this.mapPatternToStatementType(pattern.type),
          domain: 'mathematics' as any,
          dependencies: [],
          variables: this.createVariableObjects(pattern.variables),
          hypotheses: this.extractHypotheses(pattern.pattern),
          conclusion: this.extractConclusion(pattern.pattern),
          latex: this.convertToLatex(pattern.pattern),
          extractionConfidence: pattern.confidence
        };

        statements.push(statement);

      } catch (error) {
        this.logger.warn('Failed to extract formal statement from pattern', {
          pattern: pattern.pattern,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return statements;
  }

  /**
   * Extract mathematical claims
   */
  private extractMathematicalClaims(text: string, patterns: MathPattern[]): MathClaim[] {
    const claims: MathClaim[] = [];

    // Group patterns by proximity to create claims
    const claimGroups = this.groupPatternsByProximity(patterns);

    for (const group of claimGroups) {
      const claim: MathClaim = {
        id: this.generateClaimId(group),
        claim: group.map(p => p.pattern).join(' '),
        formalStatements: [], // Will be populated later
        location: {
          start: Math.min(...group.map(p => p.location.start)),
          end: Math.max(...group.map(p => p.location.end))
        },
        type: this.determineClaimType(group),
        evidenceStrength: this.calculateEvidenceStrength(group),
        dependencies: []
      };

      claims.push(claim);
    }

    return claims;
  }

  /**
   * Generate proof sketches
   */
  private generateProofSketches(claims: MathClaim[], patterns: MathPattern[]): ProofSketch[] {
    const sketches: ProofSketch[] = [];

    for (const claim of claims) {
      const strategy = this.determineProofStrategy(claim, patterns);
      const complexity = this.estimateProofComplexity(claim, patterns);

      const sketch: ProofSketch = {
        id: `sketch_${claim.id}`,
        mainClaim: claim.claim,
        steps: this.generateProofSteps(claim, strategy),
        strategy,
        complexity,
        requiredLemmas: this.identifyRequiredLemmas(claim, patterns)
      };

      sketches.push(sketch);
    }

    return sketches;
  }

  /**
   * Classify mathematical domains
   */
  private classifyMathematicalDomains(text: string, patterns: MathPattern[]): DomainClassification {
    const domainScores = new Map<string, number>();
    const foundKeywords = new Set<string>();

    const lowerText = text.toLowerCase();

    // Score each domain based on keyword presence
    for (const [domain, keywords] of Object.entries(this.domainPatterns)) {
      let score = 0;
      
      for (const keyword of keywords) {
        const count = (lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        if (count > 0) {
          score += count;
          foundKeywords.add(keyword);
        }
      }
      
      if (score > 0) {
        domainScores.set(domain, score);
      }
    }

    // Sort domains by score
    const sortedDomains = Array.from(domainScores.entries())
      .sort(([, a], [, b]) => b - a);

    const totalScore = Array.from(domainScores.values()).reduce((a, b) => a + b, 0);

    return {
      primaryDomain: sortedDomains[0]?.[0] || 'mathematics',
      secondaryDomains: sortedDomains.slice(1, 3).map(([domain]) => domain),
      confidence: sortedDomains[0] ? sortedDomains[0][1] / totalScore : 0,
      keywords: Array.from(foundKeywords)
    };
  }

  // Helper methods

  private extractVariables(text: string): string[] {
    // Extract single letter variables (common in mathematics)
    const variableRegex = /\b[a-zA-Z]\b/g;
    const variables = Array.from(text.matchAll(variableRegex))
      .map(match => match[0])
      .filter(v => !['a', 'an', 'is', 'in', 'of', 'or', 'if', 'to', 'be'].includes(v.toLowerCase()));
    
    return [...new Set(variables)]; // Remove duplicates
  }

  private extractContext(text: string, start: number, length: number): string {
    const contextStart = Math.max(0, start - 50);
    const contextEnd = Math.min(text.length, start + length + 50);
    return text.slice(contextStart, contextEnd);
  }

  private generateStatementId(pattern: MathPattern): string {
    return `stmt_${pattern.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapPatternToStatementType(patternType: string): MathStatementType {
    const mapping: Record<string, MathStatementType> = {
      'theorem': 'theorem',
      'lemma': 'lemma',
      'definition': 'definition',
      'axiom': 'axiom',
      'equation': 'proposition',
      'inequality': 'proposition',
      'quantifier': 'proposition'
    };
    
    return mapping[patternType] || 'proposition';
  }

  private createVariableObjects(variables: string[]): Variable[] {
    return variables.map(name => ({
      name,
      type: 'unknown', // Would need more sophisticated type inference
      domain: undefined,
      constraints: []
    }));
  }

  private extractHypotheses(text: string): string[] {
    const hypotheses: string[] = [];
    
    // Look for "if", "assume", "suppose", "let" patterns
    const hypothesisKeywords = ['if', 'assume', 'suppose', 'let'];
    
    for (const keyword of hypothesisKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b[^,.]+(,|\\.|then)`, 'gi');
      const matches = Array.from(text.matchAll(regex));
      
      for (const match of matches) {
        hypotheses.push(match[0].replace(/,|\.|then$/gi, '').trim());
      }
    }
    
    return hypotheses;
  }

  private extractConclusion(text: string): string {
    // Look for "then", "therefore", "hence", "thus" patterns
    const conclusionKeywords = ['then', 'therefore', 'hence', 'thus'];
    
    for (const keyword of conclusionKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b[^.]+\\.`, 'gi');
      const match = text.match(regex);
      
      if (match && match[0]) {
        return match[0].replace(keyword, '').trim();
      }
    }
    
    // If no explicit conclusion keyword, use the entire statement
    return text;
  }

  private convertToLatex(text: string): string {
    // Basic LaTeX conversion (simplified)
    let latex = text;
    
    // Replace common symbols
    latex = latex.replace(/=/g, ' = ');
    latex = latex.replace(/</g, ' < ');
    latex = latex.replace(/>/g, ' > ');
    latex = latex.replace(/for all/gi, '\\forall');
    latex = latex.replace(/there exists/gi, '\\exists');
    latex = latex.replace(/infinity/gi, '\\infty');
    
    return latex;
  }

  private groupPatternsByProximity(patterns: MathPattern[]): MathPattern[][] {
    const groups: MathPattern[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < patterns.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [patterns[i]];
      processed.add(i);
      
      // Look for nearby patterns (within 100 characters)
      for (let j = i + 1; j < patterns.length; j++) {
        if (processed.has(j)) continue;
        
        const distance = patterns[j].location.start - patterns[i].location.end;
        if (distance <= 100) {
          group.push(patterns[j]);
          processed.add(j);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  private generateClaimId(patterns: MathPattern[]): string {
    return `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineClaimType(patterns: MathPattern[]): MathStatementType {
    // Determine the most significant pattern type
    const types = patterns.map(p => this.mapPatternToStatementType(p.type));
    
    // Priority order
    const priority: MathStatementType[] = ['theorem', 'lemma', 'corollary', 'proposition', 'definition', 'axiom'];
    
    for (const priorityType of priority) {
      if (types.includes(priorityType)) {
        return priorityType;
      }
    }
    
    return 'proposition';
  }

  private calculateEvidenceStrength(patterns: MathPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const complexityBonus = Math.min(patterns.length * 0.1, 0.3); // Bonus for multiple patterns
    
    return Math.min(avgConfidence + complexityBonus, 1.0);
  }

  private determineProofStrategy(claim: MathClaim, patterns: MathPattern[]): ProofStrategy {
    const claimText = claim.claim.toLowerCase();
    
    if (claimText.includes('contradiction')) return 'contradiction';
    if (claimText.includes('induction')) return 'induction';
    if (claimText.includes('if and only if')) return 'equivalence';
    if (claimText.includes('construction') || claimText.includes('build')) return 'construction';
    if (claimText.includes('case') || claimText.includes('cases')) return 'case_analysis';
    
    return 'direct'; // Default strategy
  }

  private estimateProofComplexity(claim: MathClaim, patterns: MathPattern[]): ComplexityClass {
    const claimText = claim.claim.toLowerCase();
    
    // Simple heuristics for complexity estimation
    if (claimText.includes('decidable') || claimText.includes('undecidable')) return 'undecidable';
    if (claimText.includes('exponential') || claimText.includes('np-hard')) return 'exponential';
    if (claimText.includes('polynomial') || claimText.includes('linear')) return 'polynomial';
    if (claimText.includes('trivial') || claimText.includes('obvious')) return 'trivial';
    
    // Base complexity on pattern count and types
    if (patterns.length > 5) return 'exponential';
    if (patterns.length > 2) return 'polynomial';
    
    return 'polynomial';
  }

  private generateProofSteps(claim: MathClaim, strategy: ProofStrategy): any[] {
    // Generate basic proof steps based on strategy
    const steps = [];
    
    switch (strategy) {
      case 'direct':
        steps.push({
          stepNumber: 1,
          description: 'State the claim to be proven',
          justification: 'Given assumption',
          dependencies: []
        });
        break;
        
      case 'contradiction':
        steps.push({
          stepNumber: 1,
          description: 'Assume the negation of the claim',
          justification: 'Proof by contradiction',
          dependencies: []
        });
        break;
        
      case 'induction':
        steps.push({
          stepNumber: 1,
          description: 'Prove base case',
          justification: 'Induction base',
          dependencies: []
        });
        steps.push({
          stepNumber: 2,
          description: 'Prove inductive step',
          justification: 'Induction hypothesis',
          dependencies: [1]
        });
        break;
    }
    
    return steps;
  }

  private identifyRequiredLemmas(claim: MathClaim, patterns: MathPattern[]): string[] {
    const lemmas: string[] = [];
    const claimText = claim.claim.toLowerCase();
    
    // Common mathematical lemmas that might be needed
    if (claimText.includes('continuous')) lemmas.push('Definition of continuity');
    if (claimText.includes('convergence')) lemmas.push('Convergence criteria');
    if (claimText.includes('prime')) lemmas.push('Fundamental theorem of arithmetic');
    if (claimText.includes('integral')) lemmas.push('Fundamental theorem of calculus');
    
    return lemmas;
  }

  private assessComplexity(patterns: MathPattern[], statements: FormalStatement[]): ComplexityClass {
    // Assess overall complexity based on patterns and statements
    let complexity: ComplexityClass = 'trivial';
    
    if (patterns.length > 10) complexity = 'exponential';
    else if (patterns.length > 5) complexity = 'polynomial';
    else if (patterns.length > 0) complexity = 'polynomial';
    
    // Upgrade based on statement types
    const hasTheorem = statements.some(s => s.type === 'theorem');
    if (hasTheorem) {
      complexity = complexity === 'trivial' ? 'polynomial' : complexity;
    }
    
    return complexity;
  }

  private requiresFormalVerification(
    claims: MathClaim[],
    complexity: ComplexityClass,
    domainClassification: DomainClassification
  ): boolean {
    // Determine if formal verification is needed
    if (complexity === 'exponential' || complexity === 'undecidable') return true;
    if (claims.length > 3) return true;
    if (claims.some(c => c.evidenceStrength > 0.8)) return true;
    if (domainClassification.primaryDomain === 'logic') return true;
    
    return false;
  }

  private extractMathematicalDependencies(citation: Citation): string[] {
    // Extract references to other mathematical results
    const dependencies: string[] = [];
    const text = citation.content.toLowerCase();
    
    // Look for references to theorems, lemmas, etc.
    const referencePatterns = [
      /theorem\s+(\d+)/g,
      /lemma\s+(\d+)/g,
      /corollary\s+(\d+)/g,
      /proposition\s+(\d+)/g,
      /\[(\d+)\]/g // Numbered references
    ];
    
    for (const pattern of referencePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        dependencies.push(match[0]);
      }
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }
}
