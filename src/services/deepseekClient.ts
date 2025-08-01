import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios';
import { ConfigurationManager } from './configurationManager';
import { Logger } from '../utils/logger';
import {
    DeepSeekRequest,
    DeepSeekResponse,
    DeepSeekError,
    CodeCompletionRequest,
    CodeExplanationRequest,
    CodeRefactorRequest
} from '../types/deepseek';
export class DeepSeekClient {
    private static readonly BASE_URL = 'https://api.deepseek.com/v1';
    private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
    private static readonly MAX_RETRIES = 3;

    private httpClient!: AxiosInstance;
    private retryCount = new Map<string, number>();

    constructor(
        private configManager: ConfigurationManager,
        private logger: Logger
    ) {
        this.initializeHttpClient();
    }

    private initializeHttpClient(): void {
        const config = this.configManager.getConfiguration();

        this.httpClient = axios.create({
            baseURL: DeepSeekClient.BASE_URL,
            timeout: DeepSeekClient.DEFAULT_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'User-Agent': 'VSCode-AI-Assistant/1.0.0'
            }
        });

        // Request interceptor for logging
        this.httpClient.interceptors.request.use(
            (config: any) => {
                this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error: any) => {
                this.logger.error('API Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor for error handling
        this.httpClient.interceptors.response.use(
            (response: any) => {
                this.logger.debug(`API Response: ${response.status} ${response.statusText}`);
                return response;
            },
            (error: any) => this.handleApiError(error)
        );
    }

    /**
     * Generate code completion suggestions
     */
    public async generateCompletion(request: CodeCompletionRequest): Promise<string[]> {
        const prompt = this.buildCompletionPrompt(request);

        const deepseekRequest: DeepSeekRequest = {
            model: this.configManager.get('model'),
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful coding assistant. Provide code completions based on the context.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: Math.min(this.configManager.get('maxTokens'), 1024), // Limit for completions
            temperature: this.configManager.get('temperature')
        };

        try {
            const response = await this.makeRequest('/chat/completions', deepseekRequest);
            return this.parseCompletionResponse(response.data);
        } catch (error) {
            this.logger.error('Code completion failed:', error);
            throw new Error('Failed to generate code completion');
        }
    }

    /**
     * Generate code explanation
     */
    public async explainCode(request: CodeExplanationRequest): Promise<string> {
        const prompt = this.buildExplanationPrompt(request);

        const deepseekRequest: DeepSeekRequest = {
            model: this.configManager.get('model'),
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful coding assistant. Explain code clearly and concisely.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: this.configManager.get('maxTokens'),
            temperature: this.configManager.get('temperature')
        };

        try {
            const response = await this.makeRequest('/chat/completions', deepseekRequest);
            return this.parseExplanationResponse(response.data);
        } catch (error) {
            this.logger.error('Code explanation failed:', error);
            throw new Error('Failed to explain code');
        }
    }

    /**
     * Generate refactored code
     */
    public async refactorCode(request: CodeRefactorRequest): Promise<string> {
        const prompt = this.buildRefactorPrompt(request);

        const deepseekRequest: DeepSeekRequest = {
            model: this.configManager.get('model'),
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful coding assistant. Refactor code to improve quality while maintaining functionality.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: this.configManager.get('maxTokens'),
            temperature: this.configManager.get('temperature')
        };

        try {
            const response = await this.makeRequest('/chat/completions', deepseekRequest);
            return this.parseRefactorResponse(response.data);
        } catch (error) {
            this.logger.error('Code refactoring failed:', error);
            throw new Error('Failed to refactor code');
        }
    }

    /**
     * Test API connection
     */
    public async testConnection(): Promise<boolean> {
        try {
            const testRequest: DeepSeekRequest = {
                model: this.configManager.get('model'),
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, this is a connection test.'
                    }
                ],
                max_tokens: 10,
                temperature: 0
            };

            await this.makeRequest('/chat/completions', testRequest);
            return true;
        } catch (error) {
            this.logger.error('Connection test failed:', error);
            return false;
        }
    }

    private async makeRequest(endpoint: string, data: any): Promise<AxiosResponse<DeepSeekResponse>> {
        const requestId = `${endpoint}-${Date.now()}`;

        try {
            const config = this.configManager.getConfiguration();

            // Update authorization header if API key changed
            this.httpClient.defaults.headers['Authorization'] = `Bearer ${config.apiKey}`;

            const response = await this.httpClient.post(endpoint, data);

            // Reset retry count on success
            this.retryCount.delete(requestId);

            return response;
        } catch (error) {
            return this.handleRequestError(error, endpoint, data, requestId);
        }
    }

    private async handleRequestError(
        error: any,
        endpoint: string,
        data: any,
        requestId: string
    ): Promise<AxiosResponse<DeepSeekResponse>> {
        const currentRetries = this.retryCount.get(requestId) || 0;

        if (this.shouldRetry(error) && currentRetries < DeepSeekClient.MAX_RETRIES) {
            this.retryCount.set(requestId, currentRetries + 1);
            this.logger.warn(`Retrying request ${requestId} (attempt ${currentRetries + 1})`);

            // Exponential backoff
            const delay = Math.pow(2, currentRetries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

            return this.makeRequest(endpoint, data);
        }

        this.retryCount.delete(requestId);
        throw error;
    }

    private shouldRetry(error: any): boolean {
        if (!error.response) {
            return true; // Network error
        }

        const status = error.response.status;
        // Retry on server errors and rate limiting
        return status >= 500 || status === 429;
    }

    private handleApiError(error: AxiosError): Promise<never> {
        if (error.response) {
            const deepseekError = error.response.data as DeepSeekError;
            this.logger.error(`API Error ${error.response.status}:`, deepseekError);

            switch (error.response.status) {
                case 401:
                    throw new Error('Invalid API key. Please check your configuration.');
                case 429:
                    throw new Error('Rate limit exceeded. Please try again later.');
                case 500:
                    throw new Error('DeepSeek API server error. Please try again later.');
                default:
                    throw new Error(`API Error: ${deepseekError.error?.message || 'Unknown error'}`);
            }
        } else if (error.request) {
            this.logger.error('Network Error:', error.message);
            throw new Error('Network error. Please check your internet connection.');
        } else {
            this.logger.error('Request Error:', error.message);
            throw new Error(`Request error: ${error.message}`);
        }
    }

    private buildCompletionPrompt(request: CodeCompletionRequest): string {
        return `Language: ${request.language}

Context:
\`\`\`${request.language}
${request.context}
\`\`\`

Please provide ${request.maxSuggestions || 3} relevant code completion suggestions for the cursor position at the end of the context. Return only the code suggestions, one per line.`;
    }

    private buildExplanationPrompt(request: CodeExplanationRequest): string {
        return `Language: ${request.language}

Code to explain:
\`\`\`${request.language}
${request.code}
\`\`\`

Please provide a clear and concise explanation of what this code does${request.includeExamples ? ', including examples if helpful' : ''}.`;
    }

    private buildRefactorPrompt(request: CodeRefactorRequest): string {
        const refactorInstructions = {
            optimize: 'Optimize this code for better performance',
            readability: 'Improve code readability and maintainability',
            performance: 'Optimize this code for maximum performance',
            security: 'Improve code security and fix potential vulnerabilities'
        };

        return `Language: ${request.language}

Current code:
\`\`\`${request.language}
${request.code}
\`\`\`

Task: ${refactorInstructions[request.refactorType]}

Please provide the refactored code with comments explaining the improvements made.`;
    }

    private parseCompletionResponse(response: DeepSeekResponse): string[] {
        if (!response.choices || response.choices.length === 0) {
            return [];
        }

        const content = response.choices[0].message.content;
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 5); // Limit to 5 suggestions
    }

    private parseExplanationResponse(response: DeepSeekResponse): string {
        if (!response.choices || response.choices.length === 0) {
            return 'No explanation available.';
        }

        return response.choices[0].message.content.trim();
    }

    private parseRefactorResponse(response: DeepSeekResponse): string {
        if (!response.choices || response.choices.length === 0) {
            return 'No refactoring suggestions available.';
        }

        return response.choices[0].message.content.trim();
    }

    public dispose(): void {
        // Clean up any resources if needed
        this.retryCount.clear();
    }
}