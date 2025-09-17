/**
 * Minimal Kwisatz-Haderach Extension for VSIX creation
 * This is a simplified version that compiles and can be packaged for initial testing
 */

import * as vscode from 'vscode';

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('🎯 Kwisatz-Haderach Citation Intelligence Framework activating...');

  // Register basic commands
  const analyzeCitationsCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.analyzeCitations',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Please open a document to analyze citations.');
        return;
      }

      // Mock analysis
      const text = editor.document.getText();
      const citationPattern = /\([^)]*\d{4}[^)]*\)/g;
      const matches = text.match(citationPattern) || [];

      vscode.window.showInformationMessage(
        `Found ${matches.length} potential citations in the document. 
        Citation Intelligence features will be available in future updates.`
      );
    }
  );

  const validatePaperCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.validatePaper',
    async () => {
      vscode.window.showInformationMessage(
        '📚 Paper validation with AI-powered intent analysis coming soon!'
      );
    }
  );

  const generateRecommendationsCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.generateRecommendations',
    async () => {
      vscode.window.showInformationMessage(
        '💡 AI-powered citation recommendations with proof assistant integration coming soon!'
      );
    }
  );

  const trainDomainModelCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.trainDomainModel',
    async () => {
      vscode.window.showInformationMessage(
        '🧠 Domain-specific model training (Purpose Framework) coming soon!'
      );
    }
  );

  const openCitationPanelCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.openCitationPanel',
    async () => {
      vscode.window.showInformationMessage(
        '📊 Citation Intelligence Panel coming soon!'
      );
    }
  );

  const toggleValidationDecorationsCommand = vscode.commands.registerCommand(
    'kwisatz-haderach.toggleValidationDecorations',
    async () => {
      const config = vscode.workspace.getConfiguration('kwisatz-haderach');
      const current = config.get<boolean>('ui.showQualityIndicators', true);
      await config.update('ui.showQualityIndicators', !current, vscode.ConfigurationTarget.Global);
      
      vscode.window.showInformationMessage(
        `Citation quality indicators ${!current ? 'enabled' : 'disabled'}`
      );
    }
  );

  // Add basic citation highlighting
  const citationDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(0, 100, 200, 0.1)',
    border: '1px solid rgba(0, 100, 200, 0.3)',
    borderRadius: '2px'
  });

  // Basic document change listener for citation highlighting
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document) {
      return;
    }

    // Check if this is a supported document type
    const supportedLanguages = ['latex', 'markdown', 'plaintext'];
    const supportedExtensions = ['.tex', '.md', '.txt', '.bib'];
    
    const isSupported = supportedLanguages.includes(event.document.languageId) ||
                       supportedExtensions.some(ext => event.document.fileName.endsWith(ext));

    if (!isSupported) {
      return;
    }

    // Simple citation detection and highlighting
    const text = event.document.getText();
    const citationPattern = /\([^)]*\d{4}[^)]*\)/g;
    const decorations: vscode.DecorationOptions[] = [];
    let match;

    while ((match = citationPattern.exec(text)) !== null) {
      const start = event.document.positionAt(match.index);
      const end = event.document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(start, end);
      
      decorations.push({
        range,
        hoverMessage: `Citation detected: ${match[0]} (Advanced validation coming soon)`
      });
    }

    editor.setDecorations(citationDecorationType, decorations);
  });

  // Register all commands and listeners
  context.subscriptions.push(
    analyzeCitationsCommand,
    validatePaperCommand,
    generateRecommendationsCommand,
    trainDomainModelCommand,
    openCitationPanelCommand,
    toggleValidationDecorationsCommand,
    documentChangeListener
  );

  // Set extension as active
  await vscode.commands.executeCommand('setContext', 'kwisatz-haderach.active', true);

  // Show welcome message
  await showWelcomeMessage(context);

  console.log('✅ Kwisatz-Haderach activated successfully (minimal version)');
}

/**
 * Extension deactivation
 */
export async function deactivate(): Promise<void> {
  await vscode.commands.executeCommand('setContext', 'kwisatz-haderach.active', false);
  console.log('✅ Kwisatz-Haderach deactivated');
}

/**
 * Show welcome message on first activation
 */
async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
  
  if (!hasShownWelcome) {
    const action = await vscode.window.showInformationMessage(
      `🎯 Welcome to Kwisatz-Haderach Citation Intelligence Framework!
      
      This is an early preview version. The full AI-powered features including:
      • Multi-expert consensus validation
      • Environmental intelligence processing  
      • Intent validation with proof assistants
      • Domain-specific model training
      
      Will be available in upcoming releases.`,
      'Open Settings',
      'View Documentation',
      'Dismiss'
    );
    
    if (action === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'kwisatz-haderach');
    } else if (action === 'View Documentation') {
      await vscode.env.openExternal(vscode.Uri.parse('https://github.com/fullscreen-triangle/kwisatz-haderach/blob/main/README.md'));
    }
    
    await context.globalState.update('hasShownWelcome', true);
  }
}
