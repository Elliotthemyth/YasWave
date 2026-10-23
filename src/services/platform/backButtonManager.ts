/**
 * Centralized Android & Universal System Back Button Manager
 * 
 * Handles:
 * 1. Hardware Back button on Android (via 'backbutton' native event & 'popstate' browser history).
 * 2. Gesture back navigation on Android 10+.
 * 3. Priority ordering: Top-most modal -> active sheet/overlay -> nested view history -> app exit.
 */

export type BackActionHandler = () => boolean; // return true if handled, false to delegate

class BackButtonManager {
  private handlerStack: Array<{ id: string; handler: BackActionHandler }> = [];
  private navigationBackFallback: (() => boolean) | null = null;
  private isListening = false;
  private historyPushedCount = 0;

  constructor() {
    this.init();
  }

  public init(): void {
    if (this.isListening || typeof window === 'undefined') return;

    window.addEventListener('popstate', this.handlePopState);
    document.addEventListener('backbutton', this.handleBackButtonNative);
    this.isListening = true;
  }

  /**
   * Set fallback navigation handler when no modal/overlay is open
   */
  public setNavigationFallback(fallback: () => boolean): void {
    this.navigationBackFallback = fallback;
  }

  /**
   * Register a modal or overlay closer. Push a dummy state so Android gesture triggers popstate.
   */
  public registerHandler(id: string, handler: BackActionHandler): () => void {
    this.handlerStack.push({ id, handler });

    // Push history state to capture Android gesture / hardware back
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({ yaswaveModal: id }, '');
      this.historyPushedCount += 1;
    }

    return () => {
      this.unregisterHandler(id);
    };
  }

  public unregisterHandler(id: string): void {
    const idx = this.handlerStack.findIndex((item) => item.id === id);
    if (idx !== -1) {
      this.handlerStack.splice(idx, 1);
    }
  }

  /**
   * Execute the top-most handler or navigation fallback
   */
  public triggerBack(): boolean {
    if (this.handlerStack.length > 0) {
      // Pop from the top of the stack (most recently opened modal)
      const top = this.handlerStack.pop();
      if (top) {
        const handled = top.handler();
        if (handled) {
          return true;
        }
      }
    }

    // If no modal handled it, trigger nested view navigation back
    if (this.navigationBackFallback) {
      return this.navigationBackFallback();
    }

    return false;
  }

  private handlePopState = (event: PopStateEvent): void => {
    // If we have pushed synthetic states, prevent default navigation and handle top modal
    if (this.historyPushedCount > 0) {
      this.historyPushedCount = Math.max(0, this.historyPushedCount - 1);
    }

    const handled = this.triggerBack();
    if (!handled && event) {
      // Allow default browser back behavior when at root view with no open modals
    }
  };

  private handleBackButtonNative = (e: Event): void => {
    e.preventDefault();
    this.triggerBack();
  };

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.handlePopState);
      document.removeEventListener('backbutton', this.handleBackButtonNative);
    }
    this.handlerStack = [];
    this.isListening = false;
  }
}

export const backButtonManager = new BackButtonManager();
