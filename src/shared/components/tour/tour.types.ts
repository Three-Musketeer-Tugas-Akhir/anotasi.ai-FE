// src/shared/components/tour/tour.types.ts

export interface TourStep {
  /** The CSS selector of the element to highlight (e.g., '#tour-sidebar') */
  targetId: string;
  /** Title of the tour step */
  title: string;
  /** Main description text for the step */
  content: string;
}

export interface TourConfig {
  /** Unique identifier for the tour (used for storing completion status) */
  id: string;
  /** List of steps in the tour */
  steps: TourStep[];
}

export interface TourContextState {
  /** The currently active tour configuration (if any) */
  activeTour: TourConfig | null;
  /** The current step index */
  currentStepIndex: number;
  /** Start a specific tour */
  startTour: (tour: TourConfig) => void;
  /** Move to the next step */
  nextStep: () => void;
  /** Move to the previous step */
  prevStep: () => void;
  /** End the tour early (skip) */
  skipTour: () => void;
  /** Check if a tour has already been completed */
  hasCompletedTour: (tourId: string) => boolean;
}
