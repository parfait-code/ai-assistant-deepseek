import * as vscode from 'vscode';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel = LogLevel.INFO;

    constructor(private name: string) {
        this.outputChannel = vscode.window.createOutputChannel(`AI Assistant - ${name}`);

        // Set log level based on development mode
        const isDevelopment = process.env.NODE_ENV === 'development';
        this.logLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }

    public debug(message: string, ...args: any[]): void {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    public info(message: string, ...args: any[]): void {
        this.log(LogLevel.INFO, message, ...args);
    }

    public warn(message: string, ...args: any[]): void {
        this.log(LogLevel.WARN, message, ...args);
    }

    public error(message: string, error?: any): void {
        let errorDetails = '';
        if (error) {
            if (error instanceof Error) {
                errorDetails = `\nError: ${error.message}\nStack: ${error.stack}`;
            } else {
                errorDetails = `\nDetails: ${JSON.stringify(error, null, 2)}`;
            }
        }
        this.log(LogLevel.ERROR, message + errorDetails);
    }

    public logApiCall(method: string, url: string, duration?: number): void {
        const durationText = duration ? ` (${duration}ms)` : '';
        this.debug(`API Call: ${method} ${url}${durationText}`);
    }

    public logUserAction(action: string, context?: any): void {
        const contextText = context ? ` - Context: ${JSON.stringify(context)}` : '';
        this.info(`User Action: ${action}${contextText}`);
    }

    private log(level: LogLevel, message: string, ...args: any[]): void {
        if (level < this.logLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        const formattedMessage = `[${timestamp}] [${levelName}] ${message}`;

        // Add args if any
        const fullMessage = args.length > 0
            ? `${formattedMessage} ${args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')}`
            : formattedMessage;

        this.outputChannel.appendLine(fullMessage);

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(fullMessage);
        }

        // Show in VSCode for errors
        if (level === LogLevel.ERROR) {
            this.outputChannel.show(true);
        }
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
        this.info(`Log level set to: ${LogLevel[level]}`);
    }

    public show(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}