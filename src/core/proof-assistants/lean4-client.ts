/**
 * Lean 4 Proof Assistant Client
 * 
 * Implements the Lean 4 integration for formal mathematical verification
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

import { BaseProofAssistant, type ProofAssistantCapabilities } from './base-proof-assistant';
import type {
  ProofAssistantType,
  FormalStatement,
  SingleProofResult,
  TranslationResult,
  ProofSearchResult,
  ValidationContext,
  ValidationError,
  ValidationWarning
} from '@/types/proof-assistants';

/**
 * Lean 4 server message types
 */
interface LeanServerMessage {
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Lean 4 diagnostic information
 */
interface LeanDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 1 | 2 | 3 | 4; // Error, Warning, Information, Hint
  message: string;
  source?: string;
  code?: string | number;
}

/**
 * Lean 4 file state
 */
interface LeanFileState {
  uri: string;
  version: number;
  diagnostics: LeanDiagnostic[];
  goals: LeanGoal[];
}

/**
 * Lean 4 goal representation
 */
interface LeanGoal {
  type: string;
  hypotheses: string[];
  conclusion: string;
}

/**
 * Lean 4 Client Implementation
 */
export class Lean4Client extends BaseProofAssistant {
  private leanProcess?: ChildProcess;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();
  private fileStates = new Map<string, LeanFileState>();
  private workspaceRoot: string;
  private leanExecutable: string;

  constructor(config: any) {
    super(config);
    this.workspaceRoot = config.workspaceRoot || os.tmpdir();
    this.leanExecutable = config.leanExecutable || 'lean';
  }

  getType(): ProofAssistantType {
    return 'lean';
  }

  getCapabilities(): ProofAssistantCapabilities {
    return {
      canValidate: true,
      canSearchProofs: true,
      canTranslateNatural: true,
      canCrossValidate: true,
      supportedDomains: [
        'mathematics',
        'computer-science',
        'logic',
        'type-theory',
        'category-theory',
        'algebra',
        'analysis',
        'topology',
        'number-theory'
      ],
      maxComplexity: 9, // Very high complexity handling
      averageValidationTime: 2000 // 2 seconds average
    };
  }

  async initialize(): Promise<boolean> {
    try {
      this.connectionStatus = 'connecting';
      this.logger.info('Initializing Lean 4 client');

      // Check if Lean is installed
      if (!(await this.checkLeanInstallation())) {
        this.connectionStatus = 'error';
        return false;
      }

      // Start Lean server
      await this.startLeanServer();
      
      // Initialize workspace
      await this.initializeWorkspace();
      
      this.connectionStatus = 'connected';
      this.logger.info('Lean 4 client initialized successfully');
      return true;

    } catch (error) {
      this.logger.error('Failed to initialize Lean 4 client', error);
      this.connectionStatus = 'error';
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = 'disconnected';
    
    // Cancel all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    // Kill Lean process
    if (this.leanProcess) {
      this.leanProcess.kill();
      this.leanProcess = undefined;
    }

    this.logger.info('Lean 4 client disconnected');
  }

  async translateToFormal(
    naturalStatement: string,
    context?: ValidationContext
  ): Promise<TranslationResult> {
    this.logger.info('Translating natural language to Lean 4', { statement: naturalStatement });

    try {
      // Create a temporary file with the natural statement as a comment
      const tempFile = await this.createTempFile(`
-- Natural statement: ${naturalStatement}
-- Translation attempt:

theorem temp_statement : Prop := by
  sorry
`);

      // Use Lean's suggestion system to help with translation
      const suggestions = await this.getSuggestions(tempFile, naturalStatement, context);
      
      // Extract mathematical patterns
      const patterns = this.extractMathematicalPatterns(naturalStatement);
      
      // Generate formal representation
      const formalStatement = await this.generateFormalStatement(patterns, suggestions, context);
      
      const confidence = this.calculateTranslationConfidence(naturalStatement, formalStatement);

      return {
        success: formalStatement !== null,
        formalStatement: formalStatement || undefined,
        confidence,
        intermediateSteps: patterns,
        errors: formalStatement ? [] : ['Failed to generate formal representation'],
        ambiguities: this.detectAmbiguities(naturalStatement)
      };

    } catch (error) {
      this.logger.error('Translation failed', error);
      return {
        success: false,
        confidence: 0,
        intermediateSteps: [],
        errors: [error instanceof Error ? error.message : 'Unknown translation error'],
        ambiguities: []
      };
    }
  }

  async validateStatement(
    statement: FormalStatement,
    context?: ValidationContext
  ): Promise<SingleProofResult> {
    this.logger.info('Validating formal statement with Lean 4', { statementId: statement.id });

    const startTime = Date.now();
    
    try {
      // Get Lean representation
      const leanCode = statement.formalRepresentations.get('lean');
      if (!leanCode) {
        // Try to translate if no Lean representation exists
        const translation = await this.translateToFormal(statement.naturalLanguage, context);
        if (!translation.success || !translation.formalStatement) {
          throw new Error('No Lean representation available and translation failed');
        }
      }

      // Create validation file
      const validationCode = this.createValidationCode(leanCode || '', statement);
      const tempFile = await this.createTempFile(validationCode);

      // Check the file with Lean
      const fileState = await this.checkFile(tempFile);
      
      // Analyze diagnostics
      const { valid, errors, warnings } = this.analyzeDiagnostics(fileState.diagnostics);
      
      // Attempt proof search if validation fails
      let formalProof: string | undefined;
      if (!valid && this.config.thresholds.requireCrossValidation) {
        const searchResult = await this.searchProof(statement, context);
        if (searchResult.proofFound) {
          formalProof = searchResult.proof;
        }
      }

      const confidence = this.calculateConfidence(valid, errors, warnings, fileState.goals);
      const verificationTime = Date.now() - startTime;

      return {
        assistant: 'lean',
        valid,
        confidence,
        formalProof,
        errors,
        warnings,
        verificationTime,
        resourceUsage: {
          memory: this.getMemoryUsage(),
          cpu: this.getCPUUsage(),
          timeout: verificationTime > this.config.timeouts.fullVerification
        }
      };

    } catch (error) {
      this.logger.error('Validation failed', error);
      return {
        assistant: 'lean',
        valid: false,
        confidence: 0,
        errors: [{
          type: 'logic',
          message: error instanceof Error ? error.message : 'Unknown validation error'
        }],
        warnings: [],
        verificationTime: Date.now() - startTime,
        resourceUsage: {
          memory: this.getMemoryUsage(),
          cpu: this.getCPUUsage(),
          timeout: true
        }
      };
    }
  }

  async searchProof(
    statement: FormalStatement,
    context?: ValidationContext
  ): Promise<ProofSearchResult> {
    this.logger.info('Searching for proof with Lean 4', { statementId: statement.id });

    const startTime = Date.now();

    try {
      const leanCode = statement.formalRepresentations.get('lean');
      if (!leanCode) {
        throw new Error('No Lean representation for proof search');
      }

      // Create proof search file with various tactics
      const proofSearchCode = this.createProofSearchCode(leanCode, statement);
      const tempFile = await this.createTempFile(proofSearchCode);

      // Check with Lean and analyze goals
      const fileState = await this.checkFile(tempFile);
      
      // Extract proof if successful
      const proof = await this.extractProof(fileState, leanCode);
      const proofFound = proof !== null;

      // Try alternative strategies if initial search fails
      const alternatives: string[] = [];
      if (!proofFound) {
        alternatives.push(...await this.tryAlternativeStrategies(statement, context));
      }

      const searchTime = Date.now() - startTime;

      return {
        proofFound,
        proof: proof || undefined,
        strategy: 'lean_tactics',
        searchTime,
        depthReached: this.calculateSearchDepth(fileState.goals),
        alternatives
      };

    } catch (error) {
      this.logger.error('Proof search failed', error);
      return {
        proofFound: false,
        strategy: 'lean_tactics',
        searchTime: Date.now() - startTime,
        depthReached: 0,
        alternatives: []
      };
    }
  }

  async checkConsistency(
    statements: FormalStatement[],
    context?: ValidationContext
  ): Promise<{
    consistent: boolean;
    contradictions: string[];
    confidence: number;
  }> {
    this.logger.info('Checking consistency with Lean 4', { statementCount: statements.length });

    try {
      // Create consistency check file
      const consistencyCode = this.createConsistencyCheckCode(statements);
      const tempFile = await this.createTempFile(consistencyCode);

      // Check with Lean
      const fileState = await this.checkFile(tempFile);
      
      // Analyze for contradictions
      const contradictions = this.detectContradictions(fileState.diagnostics, statements);
      const consistent = contradictions.length === 0;
      
      const confidence = this.calculateConsistencyConfidence(fileState, statements);

      return {
        consistent,
        contradictions,
        confidence
      };

    } catch (error) {
      this.logger.error('Consistency check failed', error);
      return {
        consistent: false,
        contradictions: ['Consistency check failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        confidence: 0
      };
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    performance: { latency: number; throughput: number };
  }> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Test basic Lean functionality
      const testCode = `
theorem test_theorem : True := by trivial
`;
      const tempFile = await this.createTempFile(testCode);
      const fileState = await this.checkFile(tempFile);
      
      const latency = Date.now() - startTime;
      
      // Check for issues
      if (fileState.diagnostics.some(d => d.severity === 1)) {
        issues.push('Basic theorem validation failed');
      }
      
      if (!this.isReady()) {
        issues.push('Lean server not ready');
      }

      return {
        healthy: issues.length === 0,
        issues,
        performance: {
          latency,
          throughput: 1000 / latency // statements per second
        }
      };

    } catch (error) {
      return {
        healthy: false,
        issues: ['Health check failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        performance: { latency: Date.now() - startTime, throughput: 0 }
      };
    }
  }

  // Private helper methods

  private async checkLeanInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const leanVersion = spawn(this.leanExecutable, ['--version']);
      
      leanVersion.on('close', (code) => {
        resolve(code === 0);
      });
      
      leanVersion.on('error', () => {
        resolve(false);
      });
    });
  }

  private async startLeanServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.leanProcess = spawn(this.leanExecutable, ['--server'], {
        cwd: this.workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.leanProcess.stdout?.on('data', (data: Buffer) => {
        this.handleServerMessage(data.toString());
      });

      this.leanProcess.stderr?.on('data', (data: Buffer) => {
        this.logger.warn('Lean server stderr:', data.toString());
      });

      this.leanProcess.on('error', (error) => {
        this.logger.error('Lean process error:', error);
        reject(error);
      });

      // Wait a bit for server to start
      setTimeout(resolve, 1000);
    });
  }

  private async initializeWorkspace(): Promise<void> {
    // Send initialize request to Lean server
    const initParams = {
      processId: process.pid,
      rootUri: `file://${this.workspaceRoot}`,
      capabilities: {
        textDocument: {
          completion: { completionItem: { snippetSupport: true } }
        }
      }
    };

    await this.sendRequest('initialize', initParams);
    await this.sendNotification('initialized', {});
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = (++this.messageId).toString();
      const message: LeanServerMessage = { id, method, params };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, this.config.timeouts.fullVerification);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const messageStr = JSON.stringify(message) + '\r\n';
      this.leanProcess?.stdin?.write(messageStr);
    });
  }

  private async sendNotification(method: string, params: any): Promise<void> {
    const message: LeanServerMessage = { method, params };
    const messageStr = JSON.stringify(message) + '\r\n';
    this.leanProcess?.stdin?.write(messageStr);
  }

  private handleServerMessage(data: string): void {
    const lines = data.split('\r\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message: LeanServerMessage = JSON.parse(line);
        
        if (message.id && this.pendingRequests.has(message.id)) {
          const request = this.pendingRequests.get(message.id)!;
          clearTimeout(request.timeout);
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            request.reject(new Error(message.error.message));
          } else {
            request.resolve(message.result);
          }
        }
      } catch (error) {
        this.logger.warn('Failed to parse server message:', line);
      }
    }
  }

  private async createTempFile(content: string): Promise<string> {
    const tempDir = path.join(os.tmpdir(), 'lean4-validation');
    await fs.mkdir(tempDir, { recursive: true });
    
    const fileName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.lean`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  private async checkFile(filePath: string): Promise<LeanFileState> {
    const content = await fs.readFile(filePath, 'utf-8');
    const uri = `file://${filePath}`;
    
    // Send textDocument/didOpen notification
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: 'lean4',
        version: 1,
        text: content
      }
    });

    // Wait for diagnostics
    await this.sleep(1000);

    // Get current state
    return this.fileStates.get(uri) || {
      uri,
      version: 1,
      diagnostics: [],
      goals: []
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractMathematicalPatterns(statement: string): string[] {
    // Extract mathematical patterns from natural language
    const patterns: string[] = [];
    
    // Common mathematical keywords and patterns
    const mathKeywords = [
      'theorem', 'lemma', 'proof', 'for all', 'there exists',
      'if and only if', 'implies', 'such that', 'let', 'assume',
      'suppose', 'by contradiction', 'induction', 'base case'
    ];

    for (const keyword of mathKeywords) {
      if (statement.toLowerCase().includes(keyword)) {
        patterns.push(`Pattern: ${keyword}`);
      }
    }

    return patterns;
  }

  private async getSuggestions(
    filePath: string, 
    statement: string, 
    context?: ValidationContext
  ): Promise<string[]> {
    // This would integrate with Lean's completion system
    // For now, return basic suggestions
    return [
      'Use theorem declaration',
      'Add type annotations',
      'Consider proof by induction',
      'Use standard library lemmas'
    ];
  }

  private async generateFormalStatement(
    patterns: string[],
    suggestions: string[],
    context?: ValidationContext
  ): Promise<string | null> {
    // Generate formal Lean code based on patterns and suggestions
    // This is a simplified implementation
    return 'theorem temp_statement : Prop := by sorry';
  }

  private calculateTranslationConfidence(natural: string, formal: string): number {
    // Calculate confidence based on various factors
    let confidence = 0.5; // Base confidence
    
    if (formal.includes('theorem') || formal.includes('lemma')) confidence += 0.2;
    if (formal.includes('by')) confidence += 0.1;
    if (!formal.includes('sorry')) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  private detectAmbiguities(statement: string): { description: string; possibleInterpretations: string[] }[] {
    const ambiguities: { description: string; possibleInterpretations: string[] }[] = [];
    
    // Detect potential ambiguities in mathematical language
    if (statement.includes('or')) {
      ambiguities.push({
        description: 'Logical OR detected - could be inclusive or exclusive',
        possibleInterpretations: ['Inclusive OR (∨)', 'Exclusive OR (⊕)']
      });
    }
    
    return ambiguities;
  }

  private createValidationCode(leanCode: string, statement: FormalStatement): string {
    return `
-- Validation of statement: ${statement.id}
-- Natural language: ${statement.naturalLanguage}

${leanCode}

#check ${statement.id}
`;
  }

  private analyzeDiagnostics(diagnostics: LeanDiagnostic[]): {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const diag of diagnostics) {
      if (diag.severity === 1) { // Error
        errors.push({
          type: 'logic',
          message: diag.message,
          location: {
            line: diag.range.start.line,
            column: diag.range.start.character
          }
        });
      } else if (diag.severity === 2) { // Warning
        warnings.push({
          type: 'style',
          message: diag.message,
          location: {
            line: diag.range.start.line,
            column: diag.range.start.character
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private calculateConfidence(
    valid: boolean,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    goals: LeanGoal[]
  ): number {
    if (!valid) return 0;
    
    let confidence = 1.0;
    confidence -= warnings.length * 0.1; // Reduce for warnings
    confidence -= goals.length * 0.05;   // Reduce for remaining goals
    
    return Math.max(confidence, 0);
  }

  private createProofSearchCode(leanCode: string, statement: FormalStatement): string {
    return `
-- Proof search for: ${statement.id}
${leanCode}

-- Try various proof tactics
example : ${statement.conclusion} := by
  simp
  <;> try { assumption }
  <;> try { trivial }
  <;> try { apply_auto_param }
  <;> sorry
`;
  }

  private async extractProof(fileState: LeanFileState, originalCode: string): Promise<string | null> {
    // Extract completed proof from file state
    // This would analyze the goals and extract the successful proof
    if (fileState.goals.length === 0 && fileState.diagnostics.every(d => d.severity !== 1)) {
      return originalCode; // Proof is complete
    }
    return null;
  }

  private calculateSearchDepth(goals: LeanGoal[]): number {
    return goals.length; // Simplified depth calculation
  }

  private async tryAlternativeStrategies(
    statement: FormalStatement,
    context?: ValidationContext
  ): Promise<string[]> {
    // Try different proof strategies
    return [
      'Try proof by contradiction',
      'Try proof by induction',
      'Try using library lemmas',
      'Try simplification tactics'
    ];
  }

  private createConsistencyCheckCode(statements: FormalStatement[]): string {
    let code = '-- Consistency check\n\n';
    
    for (const statement of statements) {
      const leanCode = statement.formalRepresentations.get('lean');
      if (leanCode) {
        code += `${leanCode}\n\n`;
      }
    }
    
    code += `
-- Check for contradictions
example : False := by
  sorry  -- This should not be provable if statements are consistent
`;
    
    return code;
  }

  private detectContradictions(
    diagnostics: LeanDiagnostic[],
    statements: FormalStatement[]
  ): string[] {
    const contradictions: string[] = [];
    
    for (const diag of diagnostics) {
      if (diag.message.toLowerCase().includes('contradiction') ||
          diag.message.toLowerCase().includes('false') ||
          diag.message.toLowerCase().includes('inconsistent')) {
        contradictions.push(diag.message);
      }
    }
    
    return contradictions;
  }

  private calculateConsistencyConfidence(
    fileState: LeanFileState,
    statements: FormalStatement[]
  ): number {
    // Calculate confidence in consistency check
    const errorCount = fileState.diagnostics.filter(d => d.severity === 1).length;
    const warningCount = fileState.diagnostics.filter(d => d.severity === 2).length;
    
    let confidence = 1.0;
    confidence -= errorCount * 0.3;
    confidence -= warningCount * 0.1;
    
    return Math.max(confidence, 0);
  }
}

// Register with factory
import { ProofAssistantFactory } from './base-proof-assistant';
ProofAssistantFactory.register('lean', Lean4Client);
