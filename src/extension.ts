/**
 * Main entry point for the Kwisatz-Haderach Citation Intelligence VSCode Extension
 * 
 * This file coordinates the activation and integration of all five AI frameworks:
 * - Purpose Framework (Paper-to-LLM transformation)
 * - Combine Harvester (Multi-expert orchestration)
 * - Four-Sided Triangle (Metacognitive optimization)
 * - Ephemeral Intelligence (Environmental processing)
 * - Integrated Validation Architecture (Triple validation)
 */

import * as vscode from 'vscode';
import type { ExtensionContext, Disposable } from 'vscode';

// Framework imports
import { CitationAnalyzer } from './services/citation-analyzer';
import { WorkflowOrchestrator } from './services/workflow-orchestrator';
import { PaperIntelligence } from './services/paper-intelligence';
import { ValidationService } from './services/validation-service';
import { RecommendationEngine } from './services/recommendation-engine';

// UI Component imports
import { CitationPanelProvider } from './ui/panels/citation-panel';
import { ValidationPanelProvider } from './ui/panels/validation-panel';
import { RecommendationsPanelProvider } from './ui/panels/recommendations-panel';
import { SettingsPanelProvider } from './ui/panels/settings-panel';

// Decorator imports
import { CitationDecorator } from './ui/decorators/citation-decorator';
import { ValidationDecorator } from './ui/decorators/validation-decorator';
import { QualityDecorator } from './ui/decorators/quality-decorator';

// Command imports
import { AnalyzeCitationsCommand } from './ui/commands/analyze-citations';
import { ValidatePaperCommand } from './ui/commands/validate-paper';
import { GenerateRecommendationsCommand } from './ui/commands/generate-recommendations';
import { TrainDomainModelCommand } from './ui/commands/train-domain-model';

// Configuration and storage imports
import { DefaultSettings } from './config/default-settings';
import { CacheManager } from './storage/cache-manager';
import { UserPreferences } from './storage/user-preferences';

// Utility imports
import { Logger } from './utils/logging';
import { PerformanceMonitor } from './utils/performance-monitor';
import { ErrorHandler } from './utils/error-handling';

/**
 * Extension activation function called by VSCode
 */
export async function activate(context: ExtensionContext): Promise<void> {
  const logger = Logger.getInstance();
  const performanceMonitor = PerformanceMonitor.getInstance();
  const errorHandler = ErrorHandler.getInstance();

  logger.info('🎯 Kwisatz-Haderach Citation Intelligence Framework activating...');
  
  const activationStart = performance.now();

  try {
    // Initialize extension state
    await initializeExtension(context);

    // Initialize core services
    const services = await initializeServices(context);
    
    // Initialize UI components
    const uiComponents = await initializeUIComponents(context, services);
    
    // Initialize decorators
    const decorators = await initializeDecorators(context, services);
    
    // Register commands
    await registerCommands(context, services);
    
    // Setup event listeners
    await setupEventListeners(context, services, uiComponents, decorators);
    
    // Perform post-activation setup
    await postActivationSetup(context, services);

    // Register all disposables
    registerDisposables(context, services, uiComponents, decorators);

    const activationTime = performance.now() - activationStart;
    performanceMonitor.recordActivationTime(activationTime);
    
    logger.info(`✅ Kwisatz-Haderach activated successfully in ${activationTime.toFixed(2)}ms`);
    
    // Set extension as active
    void vscode.commands.executeCommand('setContext', 'kwisatz-haderach.active', true);
    
    // Show welcome message on first activation
    await showWelcomeMessage(context);
    
  } catch (error) {
    const errorMessage = `Failed to activate Kwisatz-Haderach: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMessage, error);
    errorHandler.handleActivationError(error);
    void vscode.window.showErrorMessage(errorMessage);
    throw error;
  }
}

/**
 * Extension deactivation function called by VSCode
 */
export async function deactivate(): Promise<void> {
  const logger = Logger.getInstance();
  logger.info('🔄 Kwisatz-Haderach Citation Intelligence Framework deactivating...');
  
  try {
    // Cleanup services
    await cleanupServices();
    
    // Save user preferences
    await saveUserState();
    
    // Clear extension context
    await vscode.commands.executeCommand('setContext', 'kwisatz-haderach.active', false);
    
    logger.info('✅ Kwisatz-Haderach deactivated successfully');
    
  } catch (error) {
    logger.error('Error during deactivation:', error);
    // Don't throw during deactivation as it can cause issues
  }
}

// ========== Initialization Functions ==========

/**
 * Initialize extension state and configuration
 */
async function initializeExtension(context: ExtensionContext): Promise<void> {
  const logger = Logger.getInstance();
  
  // Initialize logging
  logger.initialize(context);
  
  // Load default settings
  const defaultSettings = DefaultSettings.getInstance();
  await defaultSettings.initialize(context);
  
  // Initialize user preferences
  const userPreferences = UserPreferences.getInstance();
  await userPreferences.initialize(context);
  
  // Initialize cache manager
  const cacheManager = CacheManager.getInstance();
  await cacheManager.initialize(context);
  
  logger.info('📋 Extension state initialized');
}

/**
 * Initialize core AI services
 */
async function initializeServices(context: ExtensionContext): Promise<CoreServices> {
  const logger = Logger.getInstance();
  logger.info('🧠 Initializing AI framework services...');
  
  // Initialize services with dependency injection
  const citationAnalyzer = new CitationAnalyzer();
  const paperIntelligence = new PaperIntelligence();
  const validationService = new ValidationService();
  const recommendationEngine = new RecommendationEngine();
  
  // Initialize the main workflow orchestrator
  const workflowOrchestrator = new WorkflowOrchestrator(
    citationAnalyzer,
    paperIntelligence,
    validationService,
    recommendationEngine
  );
  
  // Initialize all services
  await Promise.all([
    citationAnalyzer.initialize(context),
    paperIntelligence.initialize(context),
    validationService.initialize(context),
    recommendationEngine.initialize(context),
    workflowOrchestrator.initialize(context)
  ]);
  
  logger.info('✅ AI framework services initialized');
  
  return {
    citationAnalyzer,
    paperIntelligence,
    validationService,
    recommendationEngine,
    workflowOrchestrator
  };
}

/**
 * Initialize UI panels and views
 */
async function initializeUIComponents(context: ExtensionContext, services: CoreServices): Promise<UIComponents> {
  const logger = Logger.getInstance();
  logger.info('🎨 Initializing UI components...');
  
  // Create panel providers
  const citationPanel = new CitationPanelProvider(context, services.citationAnalyzer);
  const validationPanel = new ValidationPanelProvider(context, services.validationService);
  const recommendationsPanel = new RecommendationsPanelProvider(context, services.recommendationEngine);
  const settingsPanel = new SettingsPanelProvider(context);
  
  // Register tree data providers
  vscode.window.registerTreeDataProvider('kwisatz-haderach.citationPanel', citationPanel);
  vscode.window.registerTreeDataProvider('kwisatz-haderach.validationPanel', validationPanel);
  vscode.window.registerTreeDataProvider('kwisatz-haderach.recommendationsPanel', recommendationsPanel);
  
  logger.info('✅ UI components initialized');
  
  return {
    citationPanel,
    validationPanel,
    recommendationsPanel,
    settingsPanel
  };
}

/**
 * Initialize text decorators
 */
async function initializeDecorators(context: ExtensionContext, services: CoreServices): Promise<Decorators> {
  const logger = Logger.getInstance();
  logger.info('🎨 Initializing text decorators...');
  
  const citationDecorator = new CitationDecorator(context, services.citationAnalyzer);
  const validationDecorator = new ValidationDecorator(context, services.validationService);
  const qualityDecorator = new QualityDecorator(context, services.recommendationEngine);
  
  // Initialize decorators
  await Promise.all([
    citationDecorator.initialize(),
    validationDecorator.initialize(),
    qualityDecorator.initialize()
  ]);
  
  logger.info('✅ Text decorators initialized');
  
  return {
    citationDecorator,
    validationDecorator,
    qualityDecorator
  };
}

/**
 * Register extension commands
 */
async function registerCommands(context: ExtensionContext, services: CoreServices): Promise<void> {
  const logger = Logger.getInstance();
  logger.info('⚡ Registering commands...');
  
  // Create command instances
  const analyzeCitationsCommand = new AnalyzeCitationsCommand(services.workflowOrchestrator);
  const validatePaperCommand = new ValidatePaperCommand(services.validationService);
  const generateRecommendationsCommand = new GenerateRecommendationsCommand(services.recommendationEngine);
  const trainDomainModelCommand = new TrainDomainModelCommand(services.paperIntelligence);
  
  // Register commands with VSCode
  const commands = [
    vscode.commands.registerCommand('kwisatz-haderach.analyzeCitations', 
      analyzeCitationsCommand.execute.bind(analyzeCitationsCommand)),
    vscode.commands.registerCommand('kwisatz-haderach.validatePaper', 
      validatePaperCommand.execute.bind(validatePaperCommand)),
    vscode.commands.registerCommand('kwisatz-haderach.generateRecommendations', 
      generateRecommendationsCommand.execute.bind(generateRecommendationsCommand)),
    vscode.commands.registerCommand('kwisatz-haderach.trainDomainModel', 
      trainDomainModelCommand.execute.bind(trainDomainModelCommand)),
    
    // Panel commands
    vscode.commands.registerCommand('kwisatz-haderach.openCitationPanel', () => {
      void vscode.commands.executeCommand('kwisatz-haderach.citationPanel.focus');
    }),
    
    // Decoration toggle commands
    vscode.commands.registerCommand('kwisatz-haderach.toggleValidationDecorations', async () => {
      const config = vscode.workspace.getConfiguration('kwisatz-haderach');
      const current = config.get<boolean>('ui.showQualityIndicators', true);
      await config.update('ui.showQualityIndicators', !current, vscode.ConfigurationTarget.Global);
    }),
    
    // Refresh commands
    vscode.commands.registerCommand('kwisatz-haderach.refresh', async () => {
      logger.info('🔄 Refreshing citation analysis...');
      await services.workflowOrchestrator.refreshAnalysis();
    })
  ];
  
  // Add commands to disposables
  context.subscriptions.push(...commands);
  
  logger.info(`✅ ${commands.length} commands registered`);
}

/**
 * Setup event listeners for document changes and user interactions
 */
async function setupEventListeners(
  context: ExtensionContext, 
  services: CoreServices, 
  uiComponents: UIComponents,
  decorators: Decorators
): Promise<void> {
  const logger = Logger.getInstance();
  logger.info('👂 Setting up event listeners...');
  
  // Document change listeners
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
    const document = event.document;
    
    // Only process supported file types
    if (!isSupportedDocument(document)) {
      return;
    }
    
    // Check if real-time validation is enabled
    const config = vscode.workspace.getConfiguration('kwisatz-haderach');
    const realTimeEnabled = config.get<boolean>('validation.enableRealTimeValidation', true);
    
    if (realTimeEnabled) {
      // Debounce the validation to avoid excessive processing
      await debounceValidation(document, services, decorators);
    }
  });
  
  // Active editor change listener
  const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor && isSupportedDocument(editor.document)) {
      // Update UI panels for new document
      await updatePanelsForDocument(editor.document, uiComponents);
      
      // Update decorations
      await updateDecorations(editor.document, decorators);
    }
  });
  
  // Configuration change listener
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('kwisatz-haderach')) {
      logger.info('📝 Configuration changed, updating services...');
      await updateServicesConfiguration(services);
      await updateUIConfiguration(uiComponents);
      await updateDecorationConfiguration(decorators);
    }
  });
  
  // Window state change listener
  const windowStateChangeListener = vscode.window.onDidChangeWindowState(async (windowState) => {
    // Update environmental context based on window state
    await services.workflowOrchestrator.updateEnvironmentalContext({
      windowFocused: windowState.focused,
      timestamp: new Date()
    });
  });
  
  // Add listeners to disposables
  context.subscriptions.push(
    documentChangeListener,
    activeEditorChangeListener,
    configChangeListener,
    windowStateChangeListener
  );
  
  logger.info('✅ Event listeners configured');
}

/**
 * Perform post-activation setup tasks
 */
async function postActivationSetup(context: ExtensionContext, services: CoreServices): Promise<void> {
  const logger = Logger.getInstance();
  
  // Check if user has API keys configured
  await checkAPIKeyConfiguration();
  
  // Initialize models if configured
  await initializeModelsIfConfigured(services);
  
  // Check for updates
  await checkForUpdates(context);
  
  // Record activation metrics
  await recordActivationMetrics(context);
  
  logger.info('✅ Post-activation setup completed');
}

// ========== Support Functions ==========

/**
 * Check if document is supported for citation processing
 */
function isSupportedDocument(document: vscode.TextDocument): boolean {
  const supportedLanguages = ['latex', 'markdown', 'plaintext'];
  const supportedExtensions = ['.tex', '.md', '.txt', '.bib'];
  
  return supportedLanguages.includes(document.languageId) ||
         supportedExtensions.some(ext => document.fileName.endsWith(ext));
}

/**
 * Debounced validation to avoid excessive processing
 */
let validationTimeout: NodeJS.Timeout | undefined;
async function debounceValidation(
  document: vscode.TextDocument, 
  services: CoreServices, 
  decorators: Decorators
): Promise<void> {
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }
  
  validationTimeout = setTimeout(async () => {
    try {
      await services.workflowOrchestrator.processDocument(document);
      await updateDecorations(document, decorators);
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error in debounced validation:', error);
    }
  }, 1000); // 1 second debounce
}

/**
 * Update UI panels for a new document
 */
async function updatePanelsForDocument(document: vscode.TextDocument, uiComponents: UIComponents): Promise<void> {
  await Promise.all([
    uiComponents.citationPanel.updateForDocument(document),
    uiComponents.validationPanel.updateForDocument(document),
    uiComponents.recommendationsPanel.updateForDocument(document)
  ]);
}

/**
 * Update decorations for a document
 */
async function updateDecorations(document: vscode.TextDocument, decorators: Decorators): Promise<void> {
  await Promise.all([
    decorators.citationDecorator.updateDecorations(document),
    decorators.validationDecorator.updateDecorations(document),
    decorators.qualityDecorator.updateDecorations(document)
  ]);
}

/**
 * Show welcome message on first activation
 */
async function showWelcomeMessage(context: ExtensionContext): Promise<void> {
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
  
  if (!hasShownWelcome) {
    const action = await vscode.window.showInformationMessage(
      '🎯 Welcome to Kwisatz-Haderach Citation Intelligence! Configure your AI models to get started.',
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

/**
 * Check API key configuration
 */
async function checkAPIKeyConfiguration(): Promise<void> {
  const config = vscode.workspace.getConfiguration('kwisatz-haderach');
  const hfKey = config.get<string>('huggingFace.apiKey');
  
  if (!hfKey) {
    void vscode.window.showWarningMessage(
      'Kwisatz-Haderach: HuggingFace API key not configured. Some features may be limited.',
      'Configure API Keys'
    ).then(action => {
      if (action === 'Configure API Keys') {
        void vscode.commands.executeCommand('workbench.action.openSettings', 'kwisatz-haderach.huggingFace.apiKey');
      }
    });
  }
}

/**
 * Cleanup services on deactivation
 */
async function cleanupServices(): Promise<void> {
  const logger = Logger.getInstance();
  
  // Cleanup would happen here
  // Services should implement cleanup methods
  logger.info('🧹 Services cleaned up');
}

/**
 * Save user state on deactivation
 */
async function saveUserState(): Promise<void> {
  const userPreferences = UserPreferences.getInstance();
  await userPreferences.save();
}

// ========== Type Definitions ==========

interface CoreServices {
  citationAnalyzer: CitationAnalyzer;
  paperIntelligence: PaperIntelligence;
  validationService: ValidationService;
  recommendationEngine: RecommendationEngine;
  workflowOrchestrator: WorkflowOrchestrator;
}

interface UIComponents {
  citationPanel: CitationPanelProvider;
  validationPanel: ValidationPanelProvider;
  recommendationsPanel: RecommendationsPanelProvider;
  settingsPanel: SettingsPanelProvider;
}

interface Decorators {
  citationDecorator: CitationDecorator;
  validationDecorator: ValidationDecorator;
  qualityDecorator: QualityDecorator;
}

// Placeholder functions that would be implemented later
async function updateServicesConfiguration(_services: CoreServices): Promise<void> {
  // Implementation would go here
}

async function updateUIConfiguration(_uiComponents: UIComponents): Promise<void> {
  // Implementation would go here
}

async function updateDecorationConfiguration(_decorators: Decorators): Promise<void> {
  // Implementation would go here
}

async function initializeModelsIfConfigured(_services: CoreServices): Promise<void> {
  // Implementation would go here
}

async function checkForUpdates(_context: ExtensionContext): Promise<void> {
  // Implementation would go here
}

async function recordActivationMetrics(_context: ExtensionContext): Promise<void> {
  // Implementation would go here
}

function registerDisposables(
  _context: ExtensionContext, 
  _services: CoreServices, 
  _uiComponents: UIComponents, 
  _decorators: Decorators
): void {
  // Implementation would go here
}
