import * as vscode from 'vscode';
import { AIAssistantConfiguration, ConfigurationValidationResult, ConfigurationError, ConfigurationWarning, DeepSeekModel } from '../types/configuration';
import { Logger } from '../utils/logger';

export class ConfigurationManager {
    private static readonly CONFIGURATION_SECTION = 'aiAssistant';
    private configuration: vscode.WorkspaceConfiguration;
    private disposables: vscode.Disposable[] = [];

    constructor(private logger?: Logger) {
        this.configuration = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);

        // Listen for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(this.handleConfigurationChange.bind(this))
        );
    }

    /**
     * Get current configuration with defaults
     */
    public getConfiguration(): AIAssistantConfiguration {
        return {
            apiKey: this.configuration.get<string>('apiKey', ''),
            model: this.configuration.get<DeepSeekModel>('model', 'deepseek-coder'),
            maxTokens: this.configuration.get<number>('maxTokens', 2048),
            temperature: this.configuration.get<number>('temperature', 0.1),
            completion: {
                enabled: this.configuration.get<boolean>('completion.enabled', true),
                triggerCharacters: this.configuration.get<string[]>('completion.triggerCharacters', ['.', '(', ' ']),
                debounceMs: this.configuration.get<number>('completion.debounceMs', 300)
            },
            hover: {
                enabled: this.configuration.get<boolean>('hover.enabled', true),
                showOnHover: this.configuration.get<boolean>('hover.showOnHover', true)
            },
            chat: {
                enabled: this.configuration.get<boolean>('chat.enabled', true),
                historyLimit: this.configuration.get<number>('chat.historyLimit', 50)
            },
            codeActions: {
                enabled: this.configuration.get<boolean>('codeActions.enabled', true),
                autoSuggest: this.configuration.get<boolean>('codeActions.autoSuggest', false)
            },
            cache: {
                enabled: this.configuration.get<boolean>('cache.enabled', true),
                ttlSeconds: this.configuration.get<number>('cache.ttlSeconds', 3600),
                maxEntries: this.configuration.get<number>('cache.maxEntries', 1000)
            }
        };
    }

    /**
     * Update configuration value
     */
    public async updateConfiguration<K extends keyof AIAssistantConfiguration>(
        key: K,
        value: AIAssistantConfiguration[K],
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        try {
            await this.configuration.update(key, value, target);
            this.logger?.info(`Configuration updated: ${key} = ${JSON.stringify(value)}`);
        } catch (error) {
            this.logger?.error(`Failed to update configuration ${key}:`, error);
            throw new Error(`Failed to update configuration: ${error}`);
        }
    }

    /**
     * Validate current configuration
     */
    public async validateConfiguration(): Promise<ConfigurationValidationResult> {
        const config = this.getConfiguration();
        const errors: ConfigurationError[] = [];

        // Validate API Key
        if (!config.apiKey || config.apiKey.trim() === '') {
            errors.push({
                field: 'apiKey',
                message: 'API Key is required',
                severity: 'error'
            });
        } else if (!this.isValidApiKeyFormat(config.apiKey)) {
            errors.push({
                field: 'apiKey',
                message: 'API Key format appears invalid',
                severity: 'warning'
            });
        }

        // Validate model
        if (!['deepseek-coder', 'deepseek-chat'].includes(config.model)) {
            errors.push({
                field: 'model',
                message: 'Invalid model selected',
                severity: 'error'
            });
        }

        // Validate numeric ranges
        if (config.maxTokens < 100 || config.maxTokens > 8192) {
            errors.push({
                field: 'maxTokens',
                message: 'Max tokens must be between 100 and 8192',
                severity: 'error'
            });
        }

        if (config.temperature < 0 || config.temperature > 2) {
            errors.push({
                field: 'temperature',
                message: 'Temperature must be between 0 and 2',
                severity: 'error'
            });
        }

        // Performance warnings
        if (config.maxTokens > 4096) {
            errors.push({
                field: 'maxTokens',
                message: 'High token count may impact performance',
                severity: 'warning'
            });
        }

        const isValid = !errors.some(e => e.severity === 'error');
        const warnings = errors.filter(e => e.severity === 'warning') as ConfigurationWarning[];
        const actualErrors = errors.filter(e => e.severity === 'error');

        return {
            isValid,
            errors: actualErrors,
            warnings
        };
    }

    /**
     * Get specific configuration value with type safety
     */
    public get<T extends keyof AIAssistantConfiguration>(key: T): AIAssistantConfiguration[T] {
        return this.getConfiguration()[key];
    }

    /**
     * Check if API key is accessible and valid
     */
    public async testApiConnection(): Promise<boolean> {
        const config = this.getConfiguration();
        if (!config.apiKey) {
            return false;
        }

        try {
            // This will be implemented when DeepSeekClient is ready
            // For now, just validate format
            return this.isValidApiKeyFormat(config.apiKey);
        } catch (error) {
            this.logger?.error('API connection test failed:', error);
            return false;
        }
    }

    private isValidApiKeyFormat(apiKey: string): boolean {
        // Basic format validation - adjust based on DeepSeek API key format
        return apiKey.length >= 20 && /^sk-/.test(apiKey);
    }

    private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration(ConfigurationManager.CONFIGURATION_SECTION)) {
            this.configuration = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);
            this.logger?.info('Configuration changed, reloading...');

            // Emit event for other components to react
            this.onConfigurationChanged();
        }
    }

    private onConfigurationChanged(): void {
        // This will be used by other services to react to config changes
        vscode.commands.executeCommand('aiAssistant.configurationChanged');
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}