'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTour } from './TourProvider';
import { cn } from '@/shared/utils/cn';

/**
 * AppTour renders the guided tour UI with a 4-panel overlay approach.
 *
 * Instead of a single box-shadow overlay (which is pointer-events-none),
 * we render 4 separate overlay panels (top, bottom, left, right) around
 * the highlighted element. Each panel blocks clicks. The cutout area
 * remains interactive so the user can click the highlighted element.
 */
export function AppTour() {
  const { activeTour, currentStepIndex, nextStep, prevStep, skipTour } = useTour();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (!activeTour) return;
    const step = activeTour.steps[currentStepIndex];
    if (!step) return;
    const el = document.querySelector(step.targetId);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
    }
  }, [activeTour, currentStepIndex]);

  useEffect(() => {
    if (!activeTour) return;

    const timeoutId = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [activeTour, updateRect]);

  if (!activeTour) return null;

  const currentStep = activeTour.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === activeTour.steps.length - 1;
  const progressPercent = ((currentStepIndex + 1) / activeTour.steps.length) * 100;

  // Padding around the highlighted element
  const PAD = 8;

  // Calculate the 4 overlay panel rects
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;

  const cutout = targetRect
    ? {
        top: targetRect.top - PAD,
        left: targetRect.left - PAD,
        width: targetRect.width + PAD * 2,
        height: targetRect.height + PAD * 2,
      }
    : null;

  return (
    <>
      {/* ── 4-Panel Overlay (blocks clicks outside cutout) ── */}
      {cutout ? (
        <>
          {/* Top panel */}
          <div
            className="fixed z-[9900] bg-black/65 transition-all duration-500"
            style={{ top: 0, left: 0, width: vw, height: Math.max(0, cutout.top) }}
          />
          {/* Bottom panel */}
          <div
            className="fixed z-[9900] bg-black/65 transition-all duration-500"
            style={{ top: cutout.top + cutout.height, left: 0, width: vw, height: Math.max(0, vh - cutout.top - cutout.height) }}
          />
          {/* Left panel */}
          <div
            className="fixed z-[9900] bg-black/65 transition-all duration-500"
            style={{ top: cutout.top, left: 0, width: Math.max(0, cutout.left), height: cutout.height }}
          />
          {/* Right panel */}
          <div
            className="fixed z-[9900] bg-black/65 transition-all duration-500"
            style={{ top: cutout.top, left: cutout.left + cutout.width, width: Math.max(0, vw - cutout.left - cutout.width), height: cutout.height }}
          />
          {/* Cutout border highlight (pointer-events-none so user can click through) */}
          <div
            className="fixed pointer-events-none z-[9901] border-2 border-teal-400 rounded-xl transition-all duration-500 ease-in-out"
            style={{ top: cutout.top, left: cutout.left, width: cutout.width, height: cutout.height }}
          />
        </>
      ) : (
        /* Fallback full overlay when target is not found */
        <div className="fixed inset-0 bg-black/65 z-[9900] transition-opacity duration-300" />
      )}

      {/* ── Tour Dialog Modal — Fixed Position ── */}
      <div className="fixed bottom-8 right-8 z-[9999] w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-gray-100">
          <div
            className="h-full bg-teal-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header content */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold text-gray-900">{currentStep.title}</h3>
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              aria-label="Tutup Tour"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{currentStep.content}</p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={skipTour}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={isFirstStep}
              className={cn(
                'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isFirstStep
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-200'
              )}
            >
              <ChevronLeft size={16} /> Kembali
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md shadow-teal-900/10"
            >
              {isLastStep ? 'Selesai' : 'Lanjut'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
