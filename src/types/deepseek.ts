export interface DeepSeekRequest {
    model: string;
    messages: DeepSeekMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stream?: boolean;
}

export interface DeepSeekMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface DeepSeekResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: DeepSeekChoice[];
    usage: DeepSeekUsage;
}

export interface DeepSeekChoice {
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
}

export interface DeepSeekUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface DeepSeekError {
    error: {
        message: string;
        type: string;
        code: string;
    };
}

export interface CodeCompletionRequest {
    context: string;
    language: string;
    maxSuggestions?: number;
}

export interface CodeExplanationRequest {
    code: string;
    language: string;
    includeExamples?: boolean;
}

export interface CodeRefactorRequest {
    code: string;
    language: string;
    refactorType: 'optimize' | 'readability' | 'performance' | 'security';
}