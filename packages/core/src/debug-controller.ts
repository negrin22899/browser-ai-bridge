import type { TraceEvent, TraceEventType, TraceComponent, Breakpoint } from './debugger.js';

/**
 * Debug Controller - breakpoints, pause/resume, step execution
 */

export interface DebugState {
  /** Is debugging active */
  active: boolean;
  
  /** Is execution paused */
  paused: boolean;
  
  /** Current breakpoint */
  currentBreakpoint?: Breakpoint;
  
  /** Paused event */
  pausedEvent?: TraceEvent;
  
  /** Waiting for continue */
  waitingForContinue: boolean;
}

export type DebugAction = 'continue' | 'step' | 'skip' | 'cancel';

/**
 * Debug Controller
 */
export class DebugController {
  private state: DebugState = {
    active: false,
    paused: false,
    waitingForContinue: false,
  };

  private breakpoints: Map<string, Breakpoint> = new Map();
  private resolveContinue?: (action: DebugAction) => void;

  /**
   * Enable debugging
   */
  enable(): void {
    this.state.active = true;
  }

  /**
   * Disable debugging
   */
  disable(): void {
    this.state.active = false;
    this.state.paused = false;
    this.state.waitingForContinue = false;
    this.resolveContinue?.('cancel');
  }

  /**
   * Check if debugging is active
   */
  isActive(): boolean {
    return this.state.active;
  }

  /**
   * Check if execution is paused
   */
  isPaused(): boolean {
    return this.state.paused;
  }

  /**
   * Get current debug state
   */
  getState(): DebugState {
    return { ...this.state };
  }

  /**
   * Add a breakpoint
   */
  addBreakpoint(
    eventType: TraceEventType,
    options?: {
      component?: TraceComponent;
      condition?: string;
    }
  ): Breakpoint {
    const breakpoint: Breakpoint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventType,
      component: options?.component,
      condition: options?.condition,
      enabled: true,
      hitCount: 0,
    };

    this.breakpoints.set(breakpoint.id, breakpoint);
    return breakpoint;
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(breakpointId: string): void {
    this.breakpoints.delete(breakpointId);
  }

  /**
   * Enable/disable breakpoint
   */
  toggleBreakpoint(breakpointId: string, enabled: boolean): void {
    const bp = this.breakpoints.get(breakpointId);
    if (bp) {
      bp.enabled = enabled;
    }
  }

  /**
   * Get all breakpoints
   */
  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Check if event hits a breakpoint
   */
  checkBreakpoint(event: TraceEvent): Breakpoint | null {
    if (!this.state.active) return null;

    for (const bp of this.breakpoints.values()) {
      if (!bp.enabled) continue;

      if (bp.eventType === event.type) {
        if (!bp.component || bp.component === event.component) {
          bp.hitCount++;
          return bp;
        }
      }
    }

    return null;
  }

  /**
   * Pause execution at event
   */
  async pause(event: TraceEvent, breakpoint: Breakpoint): Promise<DebugAction> {
    this.state.paused = true;
    this.state.currentBreakpoint = breakpoint;
    this.state.pausedEvent = event;
    this.state.waitingForContinue = true;

    // Wait for continue/step/skip/cancel
    return new Promise((resolve) => {
      this.resolveContinue = resolve;
    });
  }

  /**
   * Continue execution
   */
  continue(): void {
    if (this.state.paused) {
      this.state.paused = false;
      this.state.currentBreakpoint = undefined;
      this.state.pausedEvent = undefined;
      this.state.waitingForContinue = false;
      this.resolveContinue?.('continue');
      this.resolveContinue = undefined;
    }
  }

  /**
   * Step to next event
   */
  step(): void {
    if (this.state.paused) {
      this.state.paused = false;
      this.state.waitingForContinue = false;
      this.resolveContinue?.('step');
      this.resolveContinue = undefined;
    }
  }

  /**
   * Skip current event
   */
  skip(): void {
    if (this.state.paused) {
      this.state.paused = false;
      this.state.waitingForContinue = false;
      this.resolveContinue?.('skip');
      this.resolveContinue = undefined;
    }
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    if (this.state.paused) {
      this.state.paused = false;
      this.state.waitingForContinue = false;
      this.resolveContinue?.('cancel');
      this.resolveContinue = undefined;
    }
  }

  /**
   * Process event through debugger
   * Returns true if event should be processed, false if skipped
   */
  async processEvent(event: TraceEvent): Promise<boolean> {
    if (!this.state.active) {
      return true; // Not debugging, process normally
    }

    // Check breakpoint
    const breakpoint = this.checkBreakpoint(event);
    if (breakpoint) {
      const action = await this.pause(event, breakpoint);

      switch (action) {
        case 'continue':
          return true; // Process event
        case 'step':
          return true; // Process event
        case 'skip':
          return false; // Skip event
        case 'cancel':
          return false; // Cancel
      }
    }

    return true; // Process event normally
  }

  /**
   * Clear all breakpoints
   */
  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  /**
   * Reset debugger state
   */
  reset(): void {
    this.state = {
      active: false,
      paused: false,
      waitingForContinue: false,
    };
    this.resolveContinue?.('cancel');
    this.resolveContinue = undefined;
  }
}

/**
 * Global debug controller instance
 */
export const debugController = new DebugController();
