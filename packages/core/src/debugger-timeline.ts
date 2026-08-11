import type { Trace, TraceEvent } from './debugger.js';

/**
 * Trace Timeline - builds and visualizes event timelines
 */

/**
 * Build a formatted timeline string
 */
export function buildTimelineString(trace: Trace, events: TraceEvent[]): string {
  const lines: string[] = [];
  const startTime = trace.startTime;

  lines.push(`TRACE ${trace.traceId.slice(0, 8)}`);
  lines.push(`Session: ${trace.sessionId}`);
  lines.push(`Status: ${trace.status}`);
  lines.push(`Duration: ${trace.duration ?? (Date.now() - startTime)}ms`);
  lines.push('');
  lines.push('Timeline:');
  lines.push('-'.repeat(70));

  for (const event of events) {
    const relativeTime = event.timestamp - startTime;
    const timeStr = formatTime(relativeTime);
    const statusIcon = getStatusIcon(event.status);
    const durationStr = event.duration ? `${event.duration}ms`.padStart(8) : '        ';
    const summary = summarizeEvent(event);

    lines.push(`${timeStr} ${statusIcon} ${event.type.padEnd(25)} ${durationStr} ${summary}`);
  }

  lines.push('-'.repeat(70));

  // Add performance breakdown
  lines.push('');
  lines.push('Performance Breakdown:');
  lines.push('-'.repeat(40));

  const breakdown = calculatePerformanceBreakdown(trace, events);
  for (const [component, duration] of Object.entries(breakdown)) {
    const bar = '█'.repeat(Math.min(Math.round(duration / 50), 30));
    lines.push(`${component.padEnd(20)} ${String(duration + 'ms').padStart(8)} ${bar}`);
  }

  return lines.join('\n');
}

/**
 * Build a detailed event view
 */
export function buildEventDetail(event: TraceEvent): string {
  const lines: string[] = [];

  lines.push(`Event: ${event.type}`);
  lines.push(`ID: ${event.eventId.slice(0, 8)}`);
  lines.push(`Component: ${event.component}`);
  lines.push(`Status: ${event.status}`);
  lines.push(`Timestamp: ${new Date(event.timestamp).toISOString()}`);

  if (event.duration) {
    lines.push(`Duration: ${event.duration}ms`);
  }

  lines.push('');

  // Input
  if (event.data.input) {
    lines.push('Input:');
    lines.push(formatData(event.data.input));
    lines.push('');
  }

  // Output
  if (event.data.output) {
    lines.push('Output:');
    lines.push(formatData(event.data.output));
    lines.push('');
  }

  // Capabilities
  if (event.data.capabilities) {
    lines.push('Capabilities:');
    if (event.data.capabilities.provider) {
      lines.push(`  Provider: ${event.data.capabilities.provider.join(', ')}`);
    }
    if (event.data.capabilities.runtime) {
      lines.push(`  Runtime: ${event.data.capabilities.runtime.join(', ')}`);
    }
    if (event.data.capabilities.available) {
      lines.push(`  Available: ${event.data.capabilities.available.join(', ')}`);
    }
    lines.push('');
  }

  // Permissions
  if (event.data.permissions) {
    lines.push('Permissions:');
    if (event.data.permissions.allowed) {
      lines.push(`  Allowed: ${event.data.permissions.allowed.join(', ')}`);
    }
    if (event.data.permissions.denied) {
      lines.push(`  Denied: ${event.data.permissions.denied.join(', ')}`);
    }
    if (event.data.permissions.confirm) {
      lines.push(`  Confirm: ${event.data.permissions.confirm.join(', ')}`);
    }
    lines.push('');
  }

  // Provider state
  if (event.data.providerState) {
    lines.push('Provider State:');
    lines.push(`  State: ${event.data.providerState.state}`);
    if (event.data.providerState.latency) {
      lines.push(`  Latency: ${event.data.providerState.latency}ms`);
    }
    lines.push('');
  }

  // Tool info
  if (event.data.tool) {
    lines.push('Tool:');
    lines.push(`  Name: ${event.data.tool.name}`);
    if (event.data.tool.available !== undefined) {
      lines.push(`  Available: ${event.data.tool.available}`);
    }
    if (event.data.tool.reason) {
      lines.push(`  Reason: ${event.data.tool.reason}`);
    }
    lines.push('');
  }

  // Browser action
  if (event.data.browser) {
    lines.push('Browser Action:');
    lines.push(`  Action: ${event.data.browser.action}`);
    if (event.data.browser.selector) {
      lines.push(`  Selector: ${event.data.browser.selector}`);
    }
    if (event.data.browser.fallbackUsed) {
      lines.push(`  Fallback Used: true`);
    }
    lines.push('');
  }

  // Error
  if (event.error) {
    lines.push('Error:');
    lines.push(`  Code: ${event.error.code}`);
    lines.push(`  Message: ${event.error.message}`);
    lines.push(`  Recoverable: ${event.error.recoverable}`);
    if (event.error.recovery) {
      lines.push(`  Recovery: ${event.error.recovery}`);
    }
    if (event.error.rootCause) {
      lines.push('  Root Cause Chain:');
      for (const cause of event.error.rootCause) {
        lines.push(`    ${cause.component}: ${cause.description}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build a comparison between two traces
 */
export function buildComparison(traceA: Trace, eventsA: TraceEvent[], traceB: Trace, eventsB: TraceEvent[]): string {
  const lines: string[] = [];

  lines.push('Trace Comparison');
  lines.push('='.repeat(60));
  lines.push('');

  // Basic info
  lines.push('Basic Info:');
  lines.push(`  Trace A: ${traceA.traceId.slice(0, 8)} (${traceA.status})`);
  lines.push(`  Trace B: ${traceB.traceId.slice(0, 8)} (${traceB.status})`);
  lines.push(`  Duration A: ${traceA.duration ?? 0}ms`);
  lines.push(`  Duration B: ${traceB.duration ?? 0}ms`);
  lines.push('');

  // Event count
  lines.push('Events:');
  lines.push(`  Trace A: ${eventsA.length} events`);
  lines.push(`  Trace B: ${eventsB.length} events`);
  lines.push('');

  // Capabilities comparison
  const capsA = traceA.metadata.capabilities ?? [];
  const capsB = traceB.metadata.capabilities ?? [];
  const addedCaps = capsB.filter(c => !capsA.includes(c));
  const removedCaps = capsA.filter(c => !capsB.includes(c));

  if (addedCaps.length > 0 || removedCaps.length > 0) {
    lines.push('Capability Changes:');
    if (addedCaps.length > 0) {
      lines.push(`  Added: ${addedCaps.join(', ')}`);
    }
    if (removedCaps.length > 0) {
      lines.push(`  Removed: ${removedCaps.join(', ')}`);
    }
    lines.push('');
  }

  // Tools comparison
  const toolsA = traceA.metadata.availableTools ?? [];
  const toolsB = traceB.metadata.availableTools ?? [];
  const addedTools = toolsB.filter(t => !toolsA.includes(t));
  const removedTools = toolsA.filter(t => !toolsB.includes(t));

  if (addedTools.length > 0 || removedTools.length > 0) {
    lines.push('Tool Changes:');
    if (addedTools.length > 0) {
      lines.push(`  Added: ${addedTools.join(', ')}`);
    }
    if (removedTools.length > 0) {
      lines.push(`  Removed: ${removedTools.join(', ')}`);
    }
    lines.push('');
  }

  // Error comparison
  const errorsA = eventsA.filter(e => e.status === 'failed');
  const errorsB = eventsB.filter(e => e.status === 'failed');

  if (errorsA.length > 0 || errorsB.length > 0) {
    lines.push('Errors:');
    if (errorsA.length > 0) {
      lines.push(`  Trace A: ${errorsA.length} errors`);
      for (const err of errorsA) {
        lines.push(`    - ${err.error?.message ?? 'Unknown'}`);
      }
    }
    if (errorsB.length > 0) {
      lines.push(`  Trace B: ${errorsB.length} errors`);
      for (const err of errorsB) {
        lines.push(`    - ${err.error?.message ?? 'Unknown'}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format time relative to start
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  if (minutes > 0) {
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✓';
    case 'failed': return '✗';
    case 'started': return '→';
    case 'paused': return '⏸';
    case 'skipped': return '○';
    default: return '·';
  }
}

/**
 * Summarize event for display
 */
function summarizeEvent(event: TraceEvent): string {
  switch (event.type) {
    case 'request.received':
      return `Model: ${event.data.input ?? 'unknown'}`;
    case 'capability.resolved':
      return `Tools: ${event.data.capabilities?.available?.length ?? 0}`;
    case 'tool.negotiated':
      return `Tool: ${event.data.tool?.name ?? 'unknown'}`;
    case 'permission.checked':
      return `${event.data.tool?.name}: ${event.data.tool?.available ? 'allowed' : 'denied'}`;
    case 'provider.request':
      return `Provider: ${event.data.providerState?.state ?? 'unknown'}`;
    case 'provider.response':
      return `Latency: ${event.data.providerState?.latency ?? 0}ms`;
    case 'browser.action':
      return `${event.data.browser?.action}: ${event.data.browser?.selector ?? ''}`;
    case 'tool.executed':
      return `Tool: ${event.data.tool?.name ?? 'unknown'}`;
    case 'error':
      return event.error?.message ?? 'Unknown error';
    default:
      return event.type;
  }
}

/**
 * Calculate performance breakdown by component
 */
function calculatePerformanceBreakdown(_trace: Trace, events: TraceEvent[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  
  for (const event of events) {
    if (event.duration) {
      const component = event.component;
      breakdown[component] = (breakdown[component] ?? 0) + event.duration;
    }
  }

  return breakdown;
}

/**
 * Format data for display
 */
function formatData(data: unknown): string {
  if (typeof data === 'string') {
    return data.length > 200 ? data.slice(0, 200) + '...' : data;
  }
  try {
    const json = JSON.stringify(data, null, 2);
    return json.length > 500 ? json.slice(0, 500) + '...' : json;
  } catch {
    return String(data);
  }
}
