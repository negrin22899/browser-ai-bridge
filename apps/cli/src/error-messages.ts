/**
 * Actionable Error Messages
 * 
 * Transforms cryptic errors into helpful messages with solutions.
 */

export interface ActionableError {
  title: string;
  message: string;
  causes: string[];
  solutions: string[];
  command?: string;
}

/**
 * Create an actionable error message
 */
export function createActionableError(
  title: string,
  message: string,
  causes: string[],
  solutions: string[],
  command?: string
): ActionableError {
  return { title, message, causes, solutions, command };
}

/**
 * Format actionable error for display
 */
export function formatActionableError(error: ActionableError): string {
  const lines: string[] = [];

  lines.push(`\n${error.title}`);
  lines.push('='.repeat(error.title.length));
  lines.push(`\n${error.message}`);

  if (error.causes.length > 0) {
    lines.push('\nPossible causes:');
    for (const cause of error.causes) {
      lines.push(`  • ${cause}`);
    }
  }

  if (error.solutions.length > 0) {
    lines.push('\nTry:');
    for (const solution of error.solutions) {
      lines.push(`  → ${solution}`);
    }
  }

  if (error.command) {
    lines.push(`\nRun: ${error.command}`);
  }

  return lines.join('\n');
}

/**
 * Known error patterns and their actionable versions
 */
export const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  create: (match: RegExpMatchArray) => ActionableError;
}> = [
  {
    pattern: /Target page.*has been closed/i,
    create: () => ({
      title: 'Browser Session Lost',
      message: 'The browser tab was closed or became unavailable.',
      causes: [
        'Chrome was closed manually',
        'The browser profile is locked by another process',
        'The AI provider tab was closed',
        'Chrome crashed',
      ],
      solutions: [
        'Run: bab connect <provider>',
        'Check if Chrome is running',
        'Close other Chrome instances and try again',
        'Run: bab doctor',
      ],
      command: 'bab doctor',
    }),
  },
  {
    pattern: /Could not find.*input/i,
    create: () => ({
      title: 'AI Interface Not Found',
      message: 'Could not find the chat input field on the page.',
      causes: [
        'The AI provider page has changed its layout',
        'The page is still loading',
        'You are not signed in',
        'The page shows an error or captcha',
      ],
      solutions: [
        'Wait for the page to fully load',
        'Sign in to the AI provider',
        'Check if the page shows any errors',
        'Try: bab connect <provider>',
      ],
      command: 'bab connect gemini',
    }),
  },
  {
    pattern: /Could not find.*send.*button/i,
    create: () => ({
      title: 'Send Button Not Found',
      message: 'Could not find the send button on the page.',
      causes: [
        'The AI provider page has changed its layout',
        'The input field is empty',
        'The page is still loading',
      ],
      solutions: [
        'Type a message first',
        'Wait for the page to fully load',
        'Try pressing Enter instead',
      ],
    }),
  },
  {
    pattern: /Rate limit exceeded/i,
    create: () => ({
      title: 'Rate Limit Exceeded',
      message: 'Too many requests. Please wait before trying again.',
      causes: [
        'Sending too many requests too quickly',
        'The AI provider has rate limits',
      ],
      solutions: [
        'Wait a minute and try again',
        'Reduce request frequency',
      ],
    }),
  },
  {
    pattern: /User not authorized|not signed in|login required/i,
    create: () => ({
      title: 'Not Signed In',
      message: 'You need to sign in to the AI provider.',
      causes: [
        'Not signed in to the AI service',
        'Session expired',
      ],
      solutions: [
        'Open Chrome and sign in to the AI provider',
        'Run: bab connect <provider>',
      ],
      command: 'bab connect gemini',
    }),
  },
  {
    pattern: /ECONNREFUSED|Connection refused/i,
    create: () => ({
      title: 'Connection Refused',
      message: 'Cannot connect to the API server.',
      causes: [
        'The server is not running',
        'The server crashed',
        'Wrong port number',
      ],
      solutions: [
        'Start the server: bab serve --site gemini',
        'Check if another process is using the port',
        'Run: bab doctor',
      ],
      command: 'bab serve --site gemini',
    }),
  },
  {
    pattern: /Chrome not found/i,
    create: () => ({
      title: 'Chrome Not Found',
      message: 'Google Chrome is not installed.',
      causes: [
        'Chrome is not installed',
        'Chrome is installed in a non-standard location',
      ],
      solutions: [
        'Install Chrome from https://www.google.com/chrome/',
        'Provide custom path: --executable-path /path/to/chrome',
      ],
    }),
  },
  {
    pattern: /timeout.*exceeded|Timeout/i,
    create: () => ({
      title: 'Request Timeout',
      message: 'The operation took too long to complete.',
      causes: [
        'The AI provider is slow to respond',
        'The browser is not responding',
        'Network issues',
      ],
      solutions: [
        'Try again',
        'Check your internet connection',
        'Try a different provider: bab serve --site chatgpt',
      ],
    }),
  },
];

/**
 * Transform a raw error into an actionable error
 */
export function makeActionable(error: Error | string): ActionableError {
  const message = typeof error === 'string' ? error : error.message;

  // Check known patterns
  for (const { pattern, create } of ERROR_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return create(match);
    }
  }

  // Default actionable error
  return {
    title: 'Unexpected Error',
    message: message,
    causes: ['An unexpected error occurred'],
    solutions: [
      'Run: bab doctor',
      'Check the logs for more details',
      'Report the issue: https://github.com/negrin22899/browser-ai-bridge/issues',
    ],
    command: 'bab doctor',
  };
}

/**
 * Format any error for display
 */
export function formatError(error: Error | string): string {
  const actionable = makeActionable(error);
  return formatActionableError(actionable);
}
