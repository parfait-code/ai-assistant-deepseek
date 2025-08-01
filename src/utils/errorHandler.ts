import * as vscode from 'vscode';
import { Logger } from './logger';

export interface ErrorContext {
    operation: string;
    userId?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export class ErrorHandler {
    private errorCount = new Map<string, number>();
    private readonly maxErrorsPerType = 5;

    constructor(private logger: Logger) { }

    /**
     * Handle general errors with user notification
     */
    public handleError(error: any, context: string, showUser: boolean = true): void {
        const errorKey = this.getErrorKey(error, context);
        const currentCount = this.errorCount.get(errorKey) || 0;

        this.errorCount.set(errorKey, currentCount + 1);

        // Log the error
        this.logger.error(`Error in ${context}:`, error);

        // Show user notification if not too many of same error
        if (showUser && currentCount < this.maxErrorsPerType) {
            this.showErrorToUser(error, context);
        }

        // Reset error count after 5 minutes
        setTimeout(() => {
            this.errorCount.delete(errorKey);
        }, 5 * 60 * 1000);
    }

    /**
     * Handle API specific errors
     */
    public handleApiError(error: any, context: string): void {
        if (this.isNetworkError(error)) {
            this.handleNetworkError(error, context);
        } else if (this.isAuthenticationError(error)) {
            this.handleAuthenticationError(error, context);
        } else if (this.isRateLimitError(error)) {
            this.handleRateLimitError(error, context);
        } else {
            this.handleError(error, context);
        }
    }

    /**
     * Handle configuration errors
     */
    public handleConfigurationError(error: any, field?: string): void {
        this.logger.error(`Configuration error${field ? ` in field ${field}` : ''}:`, error);

        vscode.window.showErrorMessage(
            `Configuration Error: ${this.getErrorMessage(error)}`,
            'Open Settings'
        ).then(action => {
            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'aiAssistant');
            }
        });
    }

    /**
     * Handle network errors with retry option
     */
    private handleNetworkError(error: any, context: string): void {
        this.logger.error(`Network error in ${context}:`, error);

        vscode.window.showErrorMessage(
            'Network error occurred. Please check your internet connection.',
            'Retry',
            'Check Settings'
        ).then(action => {
            if (action === 'Retry') {
                // This would trigger a retry in the calling component
                vscode.commands.executeCommand('aiAssistant.retry');
            } else if (action === 'Check Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'aiAssistant');
            }
        });
    }

    /**
     * Handle authentication errors
     */
    private handleAuthenticationError(error: any, context: string): void {
        this.logger.error(`Authentication error in ${context}:`, error);

        vscode.window.showErrorMessage(
            'API authentication failed. Please check your API key.',
            'Open Settings',
            'Help'
        ).then(action => {
            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'aiAssistant.apiKey');
            } else if (action === 'Help') {
                vscode.env.openExternal(vscode.Uri.parse('https://platform.deepseek.com/api-keys'));
            }
        });
    }

    /**
     * Handle rate limit errors
     */
    private handleRateLimitError(error: any, context: string): void {
        this.logger.warn(`Rate limit exceeded in ${context}:`, error);

        vscode.window.showWarningMessage(
            'API rate limit exceeded. Please wait a moment before trying again.',
            'OK'
        );
    }

    /**
     * Show error to user with appropriate severity
     */
    private showErrorToUser(error: any, context: string): void {
        const message = this.getErrorMessage(error);
        const userMessage = `Error in ${context}: ${message}`;

        if (this.isCriticalError(error)) {
            vscode.window.showErrorMessage(userMessage, 'Show Logs').then(action => {
                if (action === 'Show Logs') {
                    this.logger.show();
                }
            });
        } else {
            vscode.window.showWarningMessage(userMessage);
        }
    }

    /**
     * Extract meaningful error message
     */
    private getErrorMessage(error: any): string {
        if (typeof error === 'string') {
            return error;
        }

        if (error instanceof Error) {
            return error.message;
        }

        if (error?.response?.data?.error?.message) {
            return error.response.data.error.message;
        }

        if (error?.message) {
            return error.message;
        }

        return 'An unexpected error occurred';
    }

    /**
     * Generate unique key for error tracking
     */
    private getErrorKey(error: any, context: string): string {
        const message = this.getErrorMessage(error);
        return `${context}:${message.substring(0, 50)}`;
    }

    /**
     * Check if error is network related
     */
    private isNetworkError(error: any): boolean {
        return !error.response && (error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ENETUNREACH' ||
            error.message?.includes('network'));
    }

    /**
     * Check if error is authentication related
     */
    private isAuthenticationError(error: any): boolean {
        return error.response?.status === 401 || error.response?.status === 403;
    }

    /**
     * Check if error is rate limit related
     */
    private isRateLimitError(error: any): boolean {
        return error.response?.status === 429;
    }

    /**
     * Check if error is critical
     */
    private isCriticalError(error: any): boolean {
        return error instanceof Error &&
            (error.name === 'TypeError' ||
                error.name === 'ReferenceError' ||
                error.message?.includes('FATAL'));
    }

    /**
     * Get error statistics for debugging
     */
    public getErrorStats(): Record<string, number> {
        return Object.fromEntries(this.errorCount);
    }

    /**
     * Clear error statistics
     */
    public clearErrorStats(): void {
        this.errorCount.clear();
    }
}