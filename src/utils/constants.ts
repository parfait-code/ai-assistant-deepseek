export const EXTENSION_ID = 'ai-assistant-deepseek';
export const EXTENSION_NAME = 'AI Assistant with DeepSeek';

export const COMMANDS = {
    GENERATE_CODE: `${EXTENSION_ID}.generateCode`,
    EXPLAIN_CODE: `${EXTENSION_ID}.explainCode`,
    REFACTOR_CODE: `${EXTENSION_ID}.refactorCode`,
    OPEN_CHAT: `${EXTENSION_ID}.openChat`,
    CLEAR_CACHE: `${EXTENSION_ID}.clearCache`,
    CONFIGURATION_CHANGED: `${EXTENSION_ID}.configurationChanged`,
    RETRY: `${EXTENSION_ID}.retry`,
} as const;

export const DEEPSEEK_MODELS = {
    CODER: 'deepseek-coder',
    CHAT: 'deepseek-chat'
} as const;

export const SUPPORTED_LANGUAGES = [
    'typescript',
    'javascript',
    'python',
    'java',
    'csharp',
    'cpp',
    'c',
    'go',
    'rust',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'scala',
    'html',
    'css',
    'sql',
    'json',
    'yaml',
    'markdown'
] as const;

export const CACHE_KEYS = {
    COMPLETION: 'completion',
    EXPLANATION: 'explanation',
    REFACTOR: 'refactor'
} as const;

export const TELEMETRY_EVENTS = {
    EXTENSION_ACTIVATED: 'extension.activated',
    COMPLETION_REQUESTED: 'completion.requested',
    EXPLANATION_REQUESTED: 'explanation.requested',
    REFACTOR_REQUESTED: 'refactor.requested',
    CHAT_OPENED: 'chat.opened',
    ERROR_OCCURRED: 'error.occurred'
} as const;