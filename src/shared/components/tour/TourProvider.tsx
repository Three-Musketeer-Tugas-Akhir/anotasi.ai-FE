'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TourConfig, TourContextState } from './tour.types';

const TourContext = createContext<TourContextState | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<Record<string, boolean>>(() => {
    // Lazy initialization for localStorage to avoid setState-in-effect
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('anotasi_completed_tours');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.error('Failed to parse completed tours', e);
      }
    }
    return {};
  });

  const hasCompletedTour = useCallback(
    (tourId: string) => {
      return !!completedTours[tourId];
    },
    [completedTours]
  );

  const markTourCompleted = useCallback(
    (tourId: string) => {
      const updated = { ...completedTours, [tourId]: true };
      setCompletedTours(updated);
      try {
        localStorage.setItem('anotasi_completed_tours', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save completed tours', e);
      }
    },
    [completedTours]
  );

  const startTour = useCallback(
    (tour: TourConfig) => {
      if (hasCompletedTour(tour.id)) return;
      setActiveTour(tour);
      setCurrentStepIndex(0);
    },
    [hasCompletedTour]
  );

  const endTour = useCallback(() => {
    if (activeTour) {
      markTourCompleted(activeTour.id);
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, markTourCompleted]);

  const skipTour = useCallback(() => {
    endTour();
  }, [endTour]);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      endTour();
    }
  }, [activeTour, currentStepIndex, endTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Handle Escape key to skip/close tour
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTour) {
        skipTour();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, skipTour]);

  return (
    <TourContext.Provider
      value={{
        activeTour,
        currentStepIndex,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        hasCompletedTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
