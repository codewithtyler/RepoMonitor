const SENSITIVE_KEYS = [
    'token',
    'key',
    'password',
    'secret',
    'auth',
    'jwt',
    'session',
    'api_key',
    'apiKey',
    'access_token',
    'accessToken',
    'user_metadata',
    'userMetadata',
    'email'
];

function sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];

        // Check if the key contains any sensitive words
        const isSensitive = SENSITIVE_KEYS.some(sensitiveKey =>
            key.toLowerCase().includes(sensitiveKey.toLowerCase())
        );

        if (isSensitive) {
            acc[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            acc[key] = sanitizeObject(value);
        } else {
            acc[key] = value;
        }

        return acc;
    }, {} as any);
}

function formatArgs(args: any[]): any[] {
    return args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            return sanitizeObject(arg);
        }
        return arg;
    });
}

export const logger = {
    info: (...args: any[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(...formatArgs(args));
        }
    },

    error: (...args: any[]) => {
        const sanitizedArgs = formatArgs(args);
        console.error(...sanitizedArgs);

        // In production, you might want to send this to an error tracking service
        if (process.env.NODE_ENV === 'production') {
            // TODO: Add error tracking service integration
            // e.g., Sentry.captureException(args[0]);
        }
    },

    warn: (...args: any[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(...formatArgs(args));
        }
    },

    debug: (...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(...formatArgs(args));
        }
    }
};
