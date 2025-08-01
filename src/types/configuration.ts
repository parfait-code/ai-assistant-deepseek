export interface AIAssistantConfiguration {
    apiKey: string;
    model: DeepSeekModel;
    maxTokens: number;
    temperature: number;
    completion: {
        enabled: boolean;
        triggerCharacters: string[];
        debounceMs: number;
    };
    hover: {
        enabled: boolean;
        showOnHover: boolean;
    };
    chat: {
        enabled: boolean;
        historyLimit: number;
    };
    codeActions: {
        enabled: boolean;
        autoSuggest: boolean;
    };
    cache: {
        enabled: boolean;
        ttlSeconds: number;
        maxEntries: number;
    };
}

export type DeepSeekModel = 'deepseek-coder' | 'deepseek-chat';

export interface ConfigurationValidationResult {
    isValid: boolean;
    errors: ConfigurationError[];
    warnings: ConfigurationWarning[];
}

export interface ConfigurationError {
    field: keyof AIAssistantConfiguration;
    message: string;
    severity: 'error' | 'warning';
}

export interface ConfigurationWarning extends ConfigurationError {
    severity: 'warning';
}