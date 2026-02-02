/**
 * ============================================================================
 * ANALYTICS - Basic Event Tracking
 * ============================================================================
 * Sistema de tracking básico para medir engagement y onboarding success.
 * Los eventos se guardan en localStorage para análisis posterior.
 * 
 * Futuro: Integrar con Google Analytics, Mixpanel, o Amplitude.
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

// ============================================================================
// EVENT NAMES
// ============================================================================
export const ANALYTICS_EVENTS = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  
  // First actions (key milestones)
  FIRST_ACCOUNT_CREATED: 'first_account_created',
  FIRST_EXPENSE_CREATED: 'first_expense_created',
  FIRST_INCOME_CREATED: 'first_income_created',
  FIRST_SAVINGS_GOAL_CREATED: 'first_savings_goal_created',
  
  // Feature tour
  TOUR_STARTED: 'tour_started',
  TOUR_STEP_VIEWED: 'tour_step_viewed',
  TOUR_COMPLETED: 'tour_completed',
  TOUR_SKIPPED: 'tour_skipped',
  
  // Help/tooltips usage
  TOOLTIP_CLICKED: 'tooltip_clicked',
  HELP_CENTER_VISITED: 'help_center_visited',
  
  // Core features usage
  EXPENSE_CREATED: 'expense_created',
  INCOME_CREATED: 'income_created',
  RECURRING_EXPENSE_CREATED: 'recurring_expense_created',
  RECURRING_INCOME_CREATED: 'recurring_income_created',
  CATEGORY_CREATED: 'category_created',
  SAVINGS_GOAL_CREATED: 'savings_goal_created',
  
  // Reports & Analytics
  REPORTS_VIEWED: 'reports_viewed',
  EXPORT_DATA: 'export_data',
  
  // Settings
  LANGUAGE_CHANGED: 'language_changed',
  THEME_CHANGED: 'theme_changed',
  ACCOUNT_SWITCHED: 'account_switched',
} as const;

// ============================================================================
// STORAGE KEY
// ============================================================================
const STORAGE_KEY = 'analytics_events';
const MAX_EVENTS = 100; // Keep only last 100 events in localStorage

// ============================================================================
// SESSION ID
// ============================================================================
let currentSessionId: string | null = null;

function getSessionId(): string {
  if (!currentSessionId) {
    // Generate session ID (valid for browser session)
    const sessionKey = 'analytics_session_id';
    let sessionId = sessionStorage.getItem(sessionKey);
    
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem(sessionKey, sessionId);
    }
    
    currentSessionId = sessionId;
  }
  
  return currentSessionId;
}

// ============================================================================
// TRACK EVENT
// ============================================================================
export function trackEvent(
  event: string,
  properties?: Record<string, any>,
  userId?: string
): void {
  try {
    // Create event object
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      userId,
      sessionId: getSessionId(),
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Analytics]', event, properties);
    }

    // Save to localStorage
    saveEventToStorage(analyticsEvent);

    // TODO: Send to external analytics service (Google Analytics, Mixpanel, etc.)
    // sendToExternalService(analyticsEvent);
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================
function saveEventToStorage(event: AnalyticsEvent): void {
  try {
    // Get existing events
    const eventsJson = localStorage.getItem(STORAGE_KEY);
    const events: AnalyticsEvent[] = eventsJson ? JSON.parse(eventsJson) : [];

    // Add new event
    events.push(event);

    // Keep only last MAX_EVENTS
    const recentEvents = events.slice(-MAX_EVENTS);

    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentEvents));
  } catch (error) {
    console.error('[Analytics] Error saving to localStorage:', error);
  }
}

export function getStoredEvents(): AnalyticsEvent[] {
  try {
    const eventsJson = localStorage.getItem(STORAGE_KEY);
    return eventsJson ? JSON.parse(eventsJson) : [];
  } catch (error) {
    console.error('[Analytics] Error reading from localStorage:', error);
    return [];
  }
}

export function clearStoredEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Analytics] Stored events cleared');
  } catch (error) {
    console.error('[Analytics] Error clearing localStorage:', error);
  }
}

// ============================================================================
// ANALYTICS SUMMARY
// ============================================================================
export interface AnalyticsSummary {
  totalEvents: number;
  uniqueSessions: number;
  eventCounts: Record<string, number>;
  firstEventDate: string | null;
  lastEventDate: string | null;
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = getStoredEvents();

  if (events.length === 0) {
    return {
      totalEvents: 0,
      uniqueSessions: 0,
      eventCounts: {},
      firstEventDate: null,
      lastEventDate: null,
    };
  }

  // Calculate summary
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
  
  const eventCounts: Record<string, number> = {};
  events.forEach(event => {
    eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
  });

  return {
    totalEvents: events.length,
    uniqueSessions,
    eventCounts,
    firstEventDate: events[0]?.timestamp || null,
    lastEventDate: events[events.length - 1]?.timestamp || null,
  };
}

// ============================================================================
// HELPERS FOR COMMON EVENTS
// ============================================================================
export const analytics = {
  // Onboarding
  onboardingStarted: () => trackEvent(ANALYTICS_EVENTS.ONBOARDING_STARTED),
  onboardingStepCompleted: (step: number) => 
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step }),
  onboardingCompleted: (timeSpentSeconds: number) => 
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, { timeSpentSeconds }),
  onboardingSkipped: (atStep: number) => 
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_SKIPPED, { atStep }),

  // Tour
  tourStarted: () => trackEvent(ANALYTICS_EVENTS.TOUR_STARTED),
  tourStepViewed: (step: number, stepName: string) => 
    trackEvent(ANALYTICS_EVENTS.TOUR_STEP_VIEWED, { step, stepName }),
  tourCompleted: () => trackEvent(ANALYTICS_EVENTS.TOUR_COMPLETED),
  tourSkipped: (atStep: number) => 
    trackEvent(ANALYTICS_EVENTS.TOUR_SKIPPED, { atStep }),

  // First actions
  firstAccountCreated: (currency: string, type: string) => 
    trackEvent(ANALYTICS_EVENTS.FIRST_ACCOUNT_CREATED, { currency, type }),
  firstExpenseCreated: (amount: number, currency: string) => 
    trackEvent(ANALYTICS_EVENTS.FIRST_EXPENSE_CREATED, { amount, currency }),
  firstIncomeCreated: (amount: number, currency: string) => 
    trackEvent(ANALYTICS_EVENTS.FIRST_INCOME_CREATED, { amount, currency }),

  // Features
  expenseCreated: (hasCategory: boolean, isRecurring: boolean) => 
    trackEvent(ANALYTICS_EVENTS.EXPENSE_CREATED, { hasCategory, isRecurring }),
  incomeCreated: (hasCategory: boolean, isRecurring: boolean) => 
    trackEvent(ANALYTICS_EVENTS.INCOME_CREATED, { hasCategory, isRecurring }),

  // Settings
  languageChanged: (from: string, to: string) => 
    trackEvent(ANALYTICS_EVENTS.LANGUAGE_CHANGED, { from, to }),
  themeChanged: (theme: string) => 
    trackEvent(ANALYTICS_EVENTS.THEME_CHANGED, { theme }),
};
