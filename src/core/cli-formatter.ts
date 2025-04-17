// src/core/cli-formatter.ts

// --- Chalk Setup (Expanded) ---
// Minimal ANSI color utilities to avoid ESM-only 'chalk' dependency
const chalk = {
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: {
    yellow: (text: string) => `\x1b[1;33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[1;34m${text}\x1b[0m`,
    red: (text: string) => `\x1b[1;31m${text}\x1b[0m`,
    green: (text: string) => `\x1b[1;32m${text}\x1b[0m`,
    white: (text: string) => `\x1b[1;37m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[1;35m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[1;90m${text}\x1b[0m`,
    cyan: (text: string) => `\x1b[1;36m${text}\x1b[0m`
  }
};

// --- Semantic Colors & Box Style ---
export const COLORS = {
  // Agent colors (add more as needed)
  agent1: (text: string) => chalk.bold.blue(text), // Example: Blue for Agent 1
  agent2: (text: string) => chalk.bold.red(text),   // Example: Red for Agent 2
  agent3: (text: string) => chalk.bold.green(text), // Example: Green for Agent 3
  moderator: (text: string) => chalk.bold.yellow(text),
  judge: (text: string) => chalk.bold.green(text),
  // General UI colors
  system: (text: string) => chalk.gray(text),
  info: (text: string) => chalk.cyan(text), // Keep cyan for general info
  success: (text: string) => chalk.green(text),
  warning: (text: string) => chalk.yellow(text),
  error: (text: string) => chalk.red(text),
  // Internal LLM logs
  internalInterpretation: (text: string) => chalk.magenta(text), // Magenta for interpretations
  internalPropositions: (text: string) => chalk.cyan(text), // Cyan for propositions (distinct from bold info)
  topic: (text: string) => chalk.bold.white(text),
  round: (text: string) => chalk.bold.magenta(text),
  analytics: (text: string) => chalk.cyan(text),
  divider: (text: string) => chalk.gray(text),
  box: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  }
};

// Define a type for the color function
export type ColorFunction = (text: string) => string;

// --- Word Wrapping ---
export function wordWrap(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if (word.includes('\n')) {
      const segments = word.split('\n');
      segments.forEach((segment, index) => {
        if (index === 0) {
          if (currentLine.length + segment.length + 1 <= maxLength) {
            currentLine += (currentLine ? ' ' : '') + segment;
          } else {
            lines.push(currentLine);
            currentLine = segment;
          }
        } else {
          lines.push(currentLine);
          currentLine = segment;
        }
      });
      return;
    }

    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// --- Box Drawing ---
export function createBox(text: string, color: ColorFunction, width = 80): string {
  const lines = wordWrap(text, width - 4);
  const box = {
    top: COLORS.box.topLeft + COLORS.box.horizontal.repeat(width - 2) + COLORS.box.topRight,
    bottom: COLORS.box.bottomLeft + COLORS.box.horizontal.repeat(width - 2) + COLORS.box.bottomRight,
    empty: COLORS.box.vertical + ' '.repeat(width - 2) + COLORS.box.vertical,
    content: (line: string) => COLORS.box.vertical + ' ' + line + ' '.repeat(Math.max(0, width - line.length - 4)) + ' ' + COLORS.box.vertical
  };

  let result = color(box.top) + '\n';

  lines.forEach(line => {
    result += color(box.content(line)) + '\n';
  });

  result += color(box.bottom);
  return result;
}

// --- Display Functions ---
export function displayMessage(agentName: string, message: string, color: ColorFunction): void {
  const width = process.stdout.columns || 80;
  const boxWidth = Math.min(width - 2, 100);

  console.log('\n' + color(agentName.toUpperCase())); // Use console.log directly
  console.log(createBox(message, color, boxWidth));
}

export function displaySystemMessage(message: string, width = 80): void {
  const boxWidth = Math.min(process.stdout.columns - 2 || width, width);
  const divider = '═'.repeat(boxWidth);
  console.log('\n' + COLORS.divider(divider));
  console.log(chalk.bold.white(message)); // Use console.log directly
  console.log(COLORS.divider(divider));
}


// --- JSON Colorization (Existing Logic) ---

// Preserve original console methods for later use
const originalConsoleDebug = console.debug;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Colorize JSON strings for improved readability in CLI
function colorizeJson(jsonString: string): string {
  try {
    // Use the chalk object defined above
    return jsonString
      .replace(/{/g, chalk.gray('{'))
      .replace(/}/g, chalk.gray('}'))
      .replace(/\[/g, chalk.gray('['))
      .replace(/\]/g, chalk.gray(']'))
      .replace(/"([^"]+)":/g, (_match, key) => `${chalk.cyan(`"${key}"`)}:`) // Removed unnecessary \
      .replace(/: "([^"]+)"/g, (_match, val) => `: ${chalk.green(`"${val}"`)}`) // Removed unnecessary \
      .replace(/: (true|false)/g, (_match, val) => `: ${chalk.yellow(val)}`)
      .replace(/: ([0-9]+\.?[0-9]*)/g, (_match, val) => `: ${chalk.yellow(val)}`);
  } catch {
    return jsonString;
  }
}

// Override console methods to automatically colorize JSON outputs
console.debug = (...args: unknown[]): void => {
  const newArgs = args.map(arg =>
    typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))
      ? colorizeJson(arg)
      : arg
  );
  originalConsoleDebug.apply(console, newArgs as any);
};

console.info = (...args: unknown[]): void => {
  const newArgs = args.map(arg =>
    typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))
      ? colorizeJson(arg)
      : arg
  );
  originalConsoleInfo.apply(console, newArgs as any);
};

console.warn = (...args: unknown[]): void => {
  const newArgs = args.map(arg =>
    typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))
      ? colorizeJson(arg)
      : arg
  );
  originalConsoleWarn.apply(console, newArgs as any);
};

console.error = (...args: unknown[]): void => {
  const newArgs = args.map(arg =>
    typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))
      ? colorizeJson(arg)
      : arg
  );
  originalConsoleError.apply(console, newArgs as any);
};

// Export the core formatting functions and constants
export { chalk }; // Export chalk if needed elsewhere, though COLORS is preferred
