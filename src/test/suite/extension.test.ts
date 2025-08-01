import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../services/configurationManager';
import { DeepSeekClient } from '../../services/deepseekClient';
import { Logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/errorHandler';

suite('Extension Test Suite', () => {
    let configManager: ConfigurationManager;
    let logger: Logger;
    let errorHandler: ErrorHandler;

    setup(() => {
        logger = new Logger('Test');
        errorHandler = new ErrorHandler(logger);
        configManager = new ConfigurationManager(logger);
    });

    teardown(() => {
        configManager?.dispose();
        logger?.dispose();
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('ai-assistant-deepseek');
        assert.ok(extension);

        if (!extension.isActive) {
            await extension.activate();
        }

        assert.ok(extension.isActive);
    });

    test('Configuration Manager should load default config', () => {
        const config = configManager.getConfiguration();

        assert.ok(config);
        assert.strictEqual(config.model, 'deepseek-coder');
        assert.strictEqual(config.maxTokens, 2048);
        assert.strictEqual(config.temperature, 0.1);
        assert.strictEqual(config.completion.enabled, true);
    });

    test('Configuration validation should work', async () => {
        const result = await configManager.validateConfiguration();

        assert.ok(result);
        assert.ok(Array.isArray(result.errors));
        assert.ok(Array.isArray(result.warnings));

        // Should have error for missing API key
        const hasApiKeyError = result.errors.some(e => e.field === 'apiKey');
        assert.ok(hasApiKeyError);
    });

    test('Logger should log messages correctly', () => {
        // This is a basic test - in real scenario you'd capture output
        assert.doesNotThrow(() => {
            logger.info('Test message');
            logger.error('Test error');
            logger.debug('Test debug');
            logger.warn('Test warning');
        });
    });

    test('Error Handler should handle errors gracefully', () => {
        assert.doesNotThrow(() => {
            errorHandler.handleError(new Error('Test error'), 'Test context', false);
            errorHandler.handleConfigurationError(new Error('Config error'));
        });
    });
});