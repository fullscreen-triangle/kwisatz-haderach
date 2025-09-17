/**
 * Enhanced Kwisatz-Haderach Extension with Proof Assistant Integration
 * 
 * Revolutionary citation intelligence with formal mathematical verification
 */

import * as vscode from 'vscode';
import type { ProofAssistantConfig } from '@/types/proof-assistants';
import type { EnhancedValidationConfig } from '@/services/enhanced-validation-service';

import { EnhancedValidationService } from '@/services/enhanced-validation-service';
import { Logger } from '@/utils/logging';

// Global services
let validationService: EnhancedValidationService | undefined;
let logger: Logger;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger = Logger.getInstance();
  logger.info('🧠 Kwisatz-Haderach Enhanced Citation Intelligence activating...');

  try {
    // Initialize configuration
    const config = createEnhancedConfig();
    
    // Initialize enhanced validation service
    validationService = new EnhancedValidationService(config);
    const initialized = await validationService.initialize();
    
    if (!initialized) {
      vscode.window.showWarningMessage(
        'Proof assistants not available - using traditional validation only'
      );
    }

    // Register enhanced commands
    registerEnhancedCommands(context);
    
    // Register status bar items
    createStatusBarItems(context);
    
    // Register document change handlers
    registerDocumentHandlers(context);

    logger.info('🎯 Kwisatz-Haderach Enhanced Extension activated successfully');
    
    // Show welcome message
    vscode.window.showInformationMessage(
      '🧠 Kwisatz-Haderach Citation Intelligence is ready! ' +
      (initialized ? 'Formal verification enabled.' : 'Traditional validation mode.'),
      'Show Help', 'Settings'
    ).then(selection => {
      if (selection === 'Show Help') {
        showHelpPanel();
      } else if (selection === 'Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:fullscreen-triangle.kwisatz-haderach');
      }
    });

  } catch (error) {
    logger.error('Failed to activate enhanced extension', error);
    vscode.window.showErrorMessage(
      `Kwisatz-Haderach activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extension deactivation
 */
export async function deactivate(): Promise<void> {
  logger.info('🛑 Kwisatz-Haderach Enhanced Extension deactivating...');
  
  try {
    if (validationService) {
      await validationService.shutdown();
    }
    
    logger.info('✅ Kwisatz-Haderach Enhanced Extension deactivated successfully');
  } catch (error) {
    logger.error('Error during deactivation', error);
  }
}

/**
 * Register enhanced commands
 */
function registerEnhancedCommands(context: vscode.ExtensionContext): void {
  // Enhanced Citation Analysis
  const analyzeEnhancedCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.analyzeEnhanced',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !validationService) {
        vscode.window.showWarningMessage('Please open a document and ensure the service is initialized.');
        return;
      }

      const document = editor.document;
      const text = document.getText();

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "🧠 Analyzing Citations",
        cancellable: false
      }, async (progress) => {
        
        progress.report({ increment: 0, message: "Extracting citations..." });
        
        // Extract citations from document
        const citations = extractCitationsFromText(text);
        
        if (citations.length === 0) {
          vscode.window.showInformationMessage('No citations found in the current document.');
          return;
        }

        progress.report({ increment: 30, message: "Running enhanced validation..." });
        
        // Validate citations with enhanced service
        const results = await validationService.validateMultipleCitations(citations);
        
        progress.report({ increment: 70, message: "Generating report..." });
        
        // Show results in a new panel
        await showEnhancedAnalysisResults(results, citations);
      });
    }
  );

  // Mathematical Verification Command
  const verifyMathCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.verifyMath',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !validationService) {
        vscode.window.showWarningMessage('Please open a document and ensure the service is initialized.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      
      if (!selectedText) {
        vscode.window.showWarningMessage('Please select text containing mathematical statements to verify.');
        return;
      }

      // Create a mock citation from selected text
      const mockCitation = {
        id: `manual_${Date.now()}`,
        content: selectedText,
        location: { start: selection.start.line, end: selection.end.line },
        source: { title: 'Manual Selection', authors: [], year: new Date().getFullYear() }
      };

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "🔍 Verifying Mathematical Content",
        cancellable: false
      }, async (progress) => {
        
        progress.report({ increment: 0, message: "Analyzing mathematical content..." });
        
        const result = await validationService.validateCitation(mockCitation);
        
        progress.report({ increment: 100, message: "Verification complete!" });
        
        await showMathematicalVerificationResult(result, selectedText);
      });
    }
  );

  // Citation Consistency Check
  const checkConsistencyCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.checkConsistency',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !validationService) {
        vscode.window.showWarningMessage('Please open a document and ensure the service is initialized.');
        return;
      }

      const text = editor.document.getText();
      const citations = extractCitationsFromText(text);

      if (citations.length < 2) {
        vscode.window.showInformationMessage('At least 2 citations are needed for consistency checking.');
        return;
      }

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "🔍 Checking Citation Consistency",
        cancellable: false
      }, async (progress) => {
        
        progress.report({ increment: 0, message: "Analyzing citations..." });
        
        const results = await validationService.validateMultipleCitations(citations);
        
        progress.report({ increment: 100, message: "Consistency check complete!" });
        
        await showConsistencyResults(results);
      });
    }
  );

  // Service Status Command
  const statusCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.showStatus',
    async () => {
      if (!validationService) {
        vscode.window.showWarningMessage('Validation service is not initialized.');
        return;
      }

      const status = validationService.getServiceStatus();
      await showServiceStatus(status);
    }
  );

  // Settings Command
  const settingsCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.openSettings',
    () => {
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:fullscreen-triangle.kwisatz-haderach');
    }
  );

  // Register all commands
  context.subscriptions.push(
    analyzeEnhancedCommand,
    verifyMathCommand,
    checkConsistencyCommand,
    statusCommand,
    settingsCommand
  );
}

/**
 * Create status bar items
 */
function createStatusBarItems(context: vscode.ExtensionContext): void {
  // Main status item
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.text = '$(telescope) Kwisatz-Haderach';
  statusItem.tooltip = 'Kwisatz-Haderach Citation Intelligence';
  statusItem.command = 'kwisatz-haderach.showStatus';
  statusItem.show();

  context.subscriptions.push(statusItem);
}

/**
 * Register document change handlers
 */
function registerDocumentHandlers(context: vscode.ExtensionContext): void {
  // Real-time citation highlighting (simplified)
  const highlightDisposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
    const config = vscode.workspace.getConfiguration('kwisatz-haderach');
    if (!config.get('validation.enableRealTimeValidation')) return;

    // Simplified real-time validation (would be optimized in production)
    const document = event.document;
    if (document.languageId !== 'markdown' && document.languageId !== 'latex') return;

    // Debounced validation would be implemented here
  });

  context.subscriptions.push(highlightDisposable);
}

/**
 * Create enhanced configuration
 */
function createEnhancedConfig(): EnhancedValidationConfig {
  const config = vscode.workspace.getConfiguration('kwisatz-haderach');
  
  const proofAssistantConfig: ProofAssistantConfig = {
    primary: 'lean',
    fallbacks: ['coq'],
    domainSpecializations: new Map(),
    timeouts: {
      quickCheck: config.get('proofAssistant.timeouts.quickCheck', 5000),
      fullVerification: config.get('proofAssistant.timeouts.fullVerification', 30000),
      crossValidation: config.get('proofAssistant.timeouts.crossValidation', 60000),
      maxTotalTime: config.get('proofAssistant.timeouts.maxTotalTime', 120000)
    },
    performance: {
      enableCaching: config.get('proofAssistant.performance.enableCaching', true),
      enableParallel: config.get('proofAssistant.performance.enableParallel', true),
      maxConcurrent: config.get('proofAssistant.performance.maxConcurrent', 3),
      memoryLimit: config.get('proofAssistant.performance.memoryLimit', 1024)
    },
    thresholds: {
      minimumConfidence: config.get('proofAssistant.thresholds.minimumConfidence', 0.7),
      requireCrossValidation: config.get('proofAssistant.thresholds.requireCrossValidation', false),
      maxErrorsAllowed: config.get('proofAssistant.thresholds.maxErrorsAllowed', 3),
      consistencyThreshold: config.get('proofAssistant.thresholds.consistencyThreshold', 0.8)
    }
  };

  return {
    enableFormalVerification: config.get('validation.enableFormalVerification', true),
    autoDetectMathematicalContent: config.get('validation.autoDetectMathematicalContent', true),
    formalVerificationThreshold: config.get('validation.formalVerificationThreshold', 0.6),
    proofAssistantConfig,
    validationMode: config.get('validation.mode', 'adaptive'),
    performance: {
      enableParallelValidation: config.get('performance.enableParallelValidation', true),
      maxValidationTime: config.get('performance.maxValidationTime', 60000),
      cacheResults: config.get('performance.cacheResults', true)
    }
  };
}

/**
 * Extract citations from text (simplified implementation)
 */
function extractCitationsFromText(text: string): any[] {
  const citations: any[] = [];
  
  // Common citation patterns
  const patterns = [
    /\([^)]*\d{4}[^)]*\)/g, // (Author, Year) style
    /\[[^\]]+\]/g, // [1] or [Author Year] style
    /\w+\s+et\s+al\.?\s*\(\d{4}\)/g // Author et al. (Year)
  ];

  let citationId = 1;
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    
    for (const match of matches) {
      if (match.index !== undefined) {
        citations.push({
          id: `citation_${citationId++}`,
          content: match[0],
          location: { start: match.index, end: match.index + match[0].length },
          source: { 
            title: 'Extracted Citation', 
            authors: ['Unknown'], 
            year: new Date().getFullYear() 
          }
        });
      }
    }
  }

  return citations;
}

/**
 * Show enhanced analysis results
 */
async function showEnhancedAnalysisResults(results: any, citations: any[]): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'kwisatzAnalysis',
    '🧠 Citation Analysis Results',
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  panel.webview.html = generateAnalysisHTML(results, citations);
}

/**
 * Show mathematical verification result
 */
async function showMathematicalVerificationResult(result: any, text: string): Promise<void> {
  const mathContent = result.mathematicalContent;
  
  let message = `Mathematical Analysis Results:\n\n`;
  message += `Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\n`;
  message += `Has Mathematical Claims: ${mathContent.hasMathematicalClaims ? '✅' : '❌'}\n`;
  message += `Requires Formal Verification: ${mathContent.requiresFormalVerification ? '✅' : '❌'}\n`;
  message += `Complexity Level: ${mathContent.complexityLevel}\n`;
  message += `Confidence: ${(result.overallAssessment.confidence * 100).toFixed(1)}%\n`;
  
  if (result.formalValidation) {
    message += `\nFormal Verification: ${result.formalValidation.primaryValidation.valid ? '✅ Passed' : '❌ Failed'}\n`;
  }

  if (result.overallAssessment.criticalIssues.length > 0) {
    message += `\n⚠️ Issues:\n${result.overallAssessment.criticalIssues.map((issue: string) => `• ${issue}`).join('\n')}`;
  }

  if (result.overallAssessment.recommendations.length > 0) {
    message += `\n💡 Recommendations:\n${result.overallAssessment.recommendations.map((rec: string) => `• ${rec}`).join('\n')}`;
  }

  const choice = await vscode.window.showInformationMessage(
    'Mathematical verification complete! View detailed results?',
    'Show Details', 'Close'
  );

  if (choice === 'Show Details') {
    const panel = vscode.window.createWebviewPanel(
      'mathVerification',
      '🔍 Mathematical Verification',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    panel.webview.html = generateMathVerificationHTML(result, text);
  }
}

/**
 * Show consistency results
 */
async function showConsistencyResults(results: any): Promise<void> {
  const consistency = results.consistencyAnalysis;
  
  let message = `Citation Consistency Analysis:\n\n`;
  message += `Overall Status: ${consistency.consistent ? '✅ Consistent' : '❌ Inconsistent'}\n`;
  message += `Confidence Score: ${(consistency.confidenceScore * 100).toFixed(1)}%\n`;
  message += `Valid Citations: ${results.overallAssessment.validCitations}/${results.overallAssessment.totalCitations}\n`;

  if (consistency.contradictions.length > 0) {
    message += `\n⚠️ Contradictions Found:\n${consistency.contradictions.map((c: string) => `• ${c}`).join('\n')}`;
  }

  if (consistency.recommendations.length > 0) {
    message += `\n💡 Recommendations:\n${consistency.recommendations.map((r: string) => `• ${r}`).join('\n')}`;
  }

  vscode.window.showInformationMessage(message, { modal: true });
}

/**
 * Show service status
 */
async function showServiceStatus(status: any): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'kwisatzStatus',
    '📊 Kwisatz-Haderach Status',
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  panel.webview.html = generateStatusHTML(status);
}

/**
 * Show help panel
 */
function showHelpPanel(): void {
  const panel = vscode.window.createWebviewPanel(
    'kwisatzHelp',
    '📚 Kwisatz-Haderach Help',
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kwisatz-Haderach Help</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #0066cc; }
            h2 { color: #333; margin-top: 30px; }
            .feature { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .command { background: #e8f4f8; padding: 10px; margin: 5px 0; border-radius: 3px; font-family: monospace; }
            .important { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
        </style>
    </head>
    <body>
        <h1>🧠 Kwisatz-Haderach Citation Intelligence</h1>
        <p>Revolutionary citation management with formal mathematical verification.</p>

        <h2>🚀 Key Features</h2>
        <div class="feature">
            <h3>Enhanced Citation Analysis</h3>
            <p>Comprehensive validation using the Triple Validation Architecture plus formal mathematical verification.</p>
            <div class="command">Command: Kwisatz-Haderach: Analyze Enhanced</div>
        </div>

        <div class="feature">
            <h3>Mathematical Verification</h3>
            <p>Formal verification of mathematical statements using Lean 4 and Coq proof assistants.</p>
            <div class="command">Command: Kwisatz-Haderach: Verify Math</div>
        </div>

        <div class="feature">
            <h3>Consistency Checking</h3>
            <p>Cross-citation consistency analysis to detect logical contradictions.</p>
            <div class="command">Command: Kwisatz-Haderach: Check Consistency</div>
        </div>

        <h2>🔧 Setup</h2>
        <div class="important">
            <strong>For full mathematical verification capabilities:</strong>
            <ul>
                <li>Install Lean 4: <a href="https://leanprover.github.io/lean4/doc/quickstart.html">Lean 4 Installation Guide</a></li>
                <li>Install Coq (optional): <a href="https://coq.inria.fr/download">Coq Installation Guide</a></li>
            </ul>
            <p>The extension will work with traditional validation even without proof assistants.</p>
        </div>

        <h2>📋 Usage</h2>
        <ol>
            <li>Open a document with citations (Markdown, LaTeX, plain text)</li>
            <li>Use <code>Ctrl+Shift+P</code> and search for "Kwisatz-Haderach"</li>
            <li>Choose your desired analysis command</li>
            <li>View results in the analysis panel</li>
        </ol>

        <h2>⚙️ Configuration</h2>
        <p>Access settings via <code>File > Preferences > Settings</code> and search for "Kwisatz-Haderach".</p>

        <h2>🏆 The Five Frameworks</h2>
        <ul>
            <li><strong>Purpose:</strong> Paper-to-LLM knowledge distillation</li>
            <li><strong>Combine Harvester:</strong> Multi-expert orchestration</li>
            <li><strong>Four-Sided Triangle:</strong> Metacognitive optimization</li>
            <li><strong>Ephemeral Intelligence:</strong> Environmental processing</li>
            <li><strong>Integrated Validation Architecture:</strong> Triple validation with proof assistants</li>
        </ul>
    </body>
    </html>
  `;
}

/**
 * Generate analysis HTML
 */
function generateAnalysisHTML(results: any, citations: any[]): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Citation Analysis Results</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; line-height: 1.6; }
            .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .citation { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .valid { border-left: 4px solid #28a745; }
            .invalid { border-left: 4px solid #dc3545; }
            .warning { border-left: 4px solid #ffc107; }
            .metric { display: inline-block; margin: 0 15px 0 0; padding: 5px 10px; background: #e9ecef; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>🧠 Citation Analysis Results</h1>
        
        <div class="summary">
            <h2>📊 Summary</h2>
            <div class="metric">Total: ${results.overallAssessment.totalCitations}</div>
            <div class="metric">Valid: ${results.overallAssessment.validCitations}</div>
            <div class="metric">Avg Confidence: ${(results.overallAssessment.averageConfidence * 100).toFixed(1)}%</div>
            <div class="metric">Issues: ${results.overallAssessment.criticalIssuesCount}</div>
        </div>

        <h2>📋 Individual Citations</h2>
        ${Array.from(results.individualResults.entries()).map(([id, result]: [string, any]) => `
            <div class="citation ${result.overallAssessment.isValid ? 'valid' : 'invalid'}">
                <h3>Citation: ${id}</h3>
                <p><strong>Content:</strong> ${citations.find((c: any) => c.id === id)?.content || 'Unknown'}</p>
                <p><strong>Status:</strong> ${result.overallAssessment.isValid ? '✅ Valid' : '❌ Invalid'}</p>
                <p><strong>Confidence:</strong> ${(result.overallAssessment.confidence * 100).toFixed(1)}%</p>
                <p><strong>Mode:</strong> ${result.metadata.validationMode}</p>
                ${result.mathematicalContent.hasMathematicalClaims ? `
                    <p><strong>Mathematical:</strong> ✅ Contains mathematical claims</p>
                    <p><strong>Complexity:</strong> ${result.mathematicalContent.complexityLevel}</p>
                    ${result.formalValidation ? `
                        <p><strong>Formal Verification:</strong> ${result.formalValidation.primaryValidation.valid ? '✅ Passed' : '❌ Failed'}</p>
                    ` : ''}
                ` : ''}
                ${result.overallAssessment.criticalIssues.length > 0 ? `
                    <div><strong>Issues:</strong></div>
                    <ul>${result.overallAssessment.criticalIssues.map((issue: string) => `<li>${issue}</li>`).join('')}</ul>
                ` : ''}
            </div>
        `).join('')}

        ${results.consistencyAnalysis.contradictions.length > 0 ? `
            <h2>⚠️ Consistency Issues</h2>
            <div class="citation warning">
                <p><strong>Status:</strong> ${results.consistencyAnalysis.consistent ? '✅ Consistent' : '❌ Inconsistent'}</p>
                <p><strong>Confidence:</strong> ${(results.consistencyAnalysis.confidenceScore * 100).toFixed(1)}%</p>
                ${results.consistencyAnalysis.contradictions.length > 0 ? `
                    <div><strong>Contradictions:</strong></div>
                    <ul>${results.consistencyAnalysis.contradictions.map((c: string) => `<li>${c}</li>`).join('')}</ul>
                ` : ''}
            </div>
        ` : ''}
    </body>
    </html>
  `;
}

/**
 * Generate mathematical verification HTML
 */
function generateMathVerificationHTML(result: any, text: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Mathematical Verification Results</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; line-height: 1.6; }
            .section { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .math-claim { background: #fff; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 3px; }
            .valid { border-left: 4px solid #28a745; }
            .invalid { border-left: 4px solid #dc3545; }
        </style>
    </head>
    <body>
        <h1>🔍 Mathematical Verification Results</h1>
        
        <div class="section">
            <h2>📝 Analyzed Text</h2>
            <p><em>${text}</em></p>
        </div>

        <div class="section">
            <h2>📊 Analysis Summary</h2>
            <p><strong>Has Mathematical Claims:</strong> ${result.mathematicalContent.hasMathematicalClaims ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Requires Formal Verification:</strong> ${result.mathematicalContent.requiresFormalVerification ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Complexity Level:</strong> ${result.mathematicalContent.complexityLevel}</p>
            <p><strong>Confidence:</strong> ${(result.overallAssessment.confidence * 100).toFixed(1)}%</p>
            <p><strong>Validation Mode:</strong> ${result.metadata.validationMode}</p>
        </div>

        ${result.formalValidation ? `
            <div class="section">
                <h2>🧮 Formal Verification</h2>
                <div class="math-claim ${result.formalValidation.primaryValidation.valid ? 'valid' : 'invalid'}">
                    <p><strong>Primary Assistant:</strong> ${result.formalValidation.primaryValidation.assistant}</p>
                    <p><strong>Result:</strong> ${result.formalValidation.primaryValidation.valid ? '✅ Valid' : '❌ Invalid'}</p>
                    <p><strong>Confidence:</strong> ${(result.formalValidation.primaryValidation.confidence * 100).toFixed(1)}%</p>
                    <p><strong>Verification Time:</strong> ${result.formalValidation.primaryValidation.verificationTime}ms</p>
                    
                    ${result.formalValidation.primaryValidation.errors.length > 0 ? `
                        <div><strong>Errors:</strong></div>
                        <ul>${result.formalValidation.primaryValidation.errors.map((e: any) => `<li>${e.message}</li>`).join('')}</ul>
                    ` : ''}
                </div>
                
                <p><strong>Consistency Score:</strong> ${(result.formalValidation.consistency.consistencyScore * 100).toFixed(1)}%</p>
                <p><strong>Complexity Assessment:</strong> ${result.formalValidation.complexity.computationalComplexity}</p>
            </div>
        ` : ''}

        ${result.overallAssessment.recommendations.length > 0 ? `
            <div class="section">
                <h2>💡 Recommendations</h2>
                <ul>${result.overallAssessment.recommendations.map((r: string) => `<li>${r}</li>`).join('')}</ul>
            </div>
        ` : ''}
    </body>
    </html>
  `;
}

/**
 * Generate status HTML
 */
function generateStatusHTML(status: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Kwisatz-Haderach Status</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; line-height: 1.6; }
            .status-section { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .metric { display: inline-block; margin: 5px 10px 5px 0; padding: 5px 10px; background: #e9ecef; border-radius: 3px; }
            .healthy { color: #28a745; }
            .unhealthy { color: #dc3545; }
        </style>
    </head>
    <body>
        <h1>📊 Kwisatz-Haderach Status</h1>
        
        <div class="status-section">
            <h2>🔧 Service Status</h2>
            <p><strong>Traditional Validation:</strong> <span class="healthy">✅ Ready</span></p>
            <p><strong>Proof Assistant:</strong> 
                <span class="${status.proofAssistant.status === 'ready' ? 'healthy' : 'unhealthy'}">
                    ${status.proofAssistant.status === 'ready' ? '✅' : '❌'} ${status.proofAssistant.status}
                </span>
            </p>
        </div>

        <div class="status-section">
            <h2>📈 Performance Metrics</h2>
            <div class="metric">Total Validations: ${status.performance.totalValidations}</div>
            <div class="metric">Average Time: ${status.performance.averageTime.toFixed(0)}ms</div>
            <div class="metric">Success Rate: ${(status.performance.successRate * 100).toFixed(1)}%</div>
        </div>

        ${status.proofAssistant.assistantStatus ? `
            <div class="status-section">
                <h2>🤖 Proof Assistants</h2>
                ${Array.from(status.proofAssistant.assistantStatus.entries()).map(([type, status]: [string, string]) => `
                    <p><strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> 
                        <span class="${status === 'connected' ? 'healthy' : 'unhealthy'}">
                            ${status === 'connected' ? '✅' : '❌'} ${status}
                        </span>
                    </p>
                `).join('')}
            </div>
        ` : ''}

        <div class="status-section">
            <h2>📋 Queue Status</h2>
            <div class="metric">Queued: ${status.proofAssistant.queueStatus?.queued || 0}</div>
            <div class="metric">Running: ${status.proofAssistant.queueStatus?.running || 0}</div>
            <div class="metric">Completed: ${status.proofAssistant.queueStatus?.completed || 0}</div>
        </div>
    </body>
    </html>
  `;
}
