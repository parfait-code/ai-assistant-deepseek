import * as vscode from 'vscode';
import { ConfigurationManager } from './services/configurationManager';
import { Logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';
import { DeepSeekClient } from './services/deepseekClient';

let configManager: ConfigurationManager;
let deepseekClient: DeepSeekClient;
let logger: Logger;
let errorHandler: ErrorHandler;

export async function activate(context: vscode.ExtensionContext) {
	logger = new Logger('AI Assistant');
	errorHandler = new ErrorHandler(logger);

	try {
		logger.info('Activating AI Assistant extension...');

		// Initialize core services
		configManager = new ConfigurationManager();
		deepseekClient = new DeepSeekClient(configManager, logger);

		// Validate configuration on startup
		await validateConfiguration();

		// Register core services in context for global access
		context.globalState.update('services', {
			configManager,
			deepseekClient,
			logger,
			errorHandler
		});

		// Show activation message
		vscode.window.showInformationMessage('AI Assistant is now active!');

		logger.info('AI Assistant extension activated successfully');

	} catch (error) {
		errorHandler.handleError(error, 'Failed to activate extension');
		throw error;
	}
}

export function deactivate() {
	logger?.info('Deactivating AI Assistant extension...');

	// Cleanup resources
	deepseekClient?.dispose();
	configManager?.dispose();

	logger?.info('AI Assistant extension deactivated');
}

async function validateConfiguration(): Promise<void> {
	const isValid = await configManager.validateConfiguration();
	if (!isValid) {
		const action = await vscode.window.showWarningMessage(
			'AI Assistant configuration is incomplete. Would you like to configure it now?',
			'Configure',
			'Later'
		);

		if (action === 'Configure') {
			vscode.commands.executeCommand('workbench.action.openSettings', 'aiAssistant');
		}
	}
}