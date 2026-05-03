/**
 * Phase 3.B — Fully Functional Vision Input
 *
 * Controlled textarea with focus glow effect.
 * Creates project and calls onProjectCreated callback for seamless transition.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/Providers";
import { authPost } from "@/lib/authFetch";

interface VisionInputProps {
  onProjectCreated?: (projectId: string, initialMessage: string) => void;
}

export default function VisionInput({ onProjectCreated }: VisionInputProps) {
  const { user } = useAuth();

  // Local UI state
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState("Build a multi-vendor marketplace with vendor onboarding, secure payment escrow, product reviews, and an admin dashboard...");

  // Listen for placeholder/vision update events from quick actions
  useEffect(() => {
    const handleSetPlaceholder = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setPlaceholder(customEvent.detail);
        // Also set the value so it becomes 'sendable'
        setValue(customEvent.detail);
      }
    };
    window.addEventListener("flowro:set-placeholder", handleSetPlaceholder);
    return () => window.removeEventListener("flowro:set-placeholder", handleSetPlaceholder);
  }, []);

  // Generate a project name from the vision text
  const generateProjectName = (text: string): string => {
    // Take first 50 chars or up to first period/newline
    const truncated = text.slice(0, 50).split(/[.\n]/)[0].trim();
    return truncated || "New Project";
  };

  // Handle submit - create project and call callback for seamless transition
  const handleSubmit = useCallback(async () => {
    if (!value.trim() || isSubmitting || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the project via API
      const response = await authPost("/api/projects", user, {
        name: generateProjectName(value),
        lastMessage: value.slice(0, 100),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      // API returns { id, ... } not { projectId }
      const { id } = await response.json();

      if (!id) {
        throw new Error("Invalid response from server");
      }

      // Call the callback for seamless in-page transition
      if (onProjectCreated) {
        onProjectCreated(id, value.trim());
      }
    } catch {
      setError("Failed to create project. Please try again.");
      setIsSubmitting(false);
    }
  }, [value, isSubmitting, user, onProjectCreated]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full relative group mt-4">
      {/* Glow Effect - enhanced when focused */}
      <div
        className={`absolute -inset-0.5 rounded-[1.75rem] bg-gradient-to-r from-[#d5e6ff] via-[#f5ebe0] to-[#d8e8ff] blur transition-opacity duration-500 ${isFocused ? "opacity-80" : "opacity-40"
          }`}
      />

      {/* Glass Panel */}
      <div
        className={`glass-panel relative rounded-[1.75rem] p-2 transition-all duration-300 ${isFocused ? "ring-1 ring-[#2f8fff]/30 shadow-[0_24px_50px_-28px_rgba(47,143,255,0.35)]" : ""
          }`}
      >
        <div className="relative flex flex-col">
          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            className="min-h-[72px] max-h-[200px] w-full resize-none border-0 bg-transparent px-5 py-4 text-lg leading-relaxed text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none disabled:opacity-50"
            placeholder={placeholder}
            rows={2}
          />

          {/* Action Bar */}
          <div className="flex items-center justify-between px-2 pb-1 pt-2">
            <div className="flex items-center gap-2">
              {/* Attach Button - disabled placeholder */}
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl p-2 text-slate-300 opacity-60"
                title="Attach file (coming soon)"
              >
                <span className="material-symbols-outlined text-[20px]">
                  attach_file
                </span>
              </button>

              {/* Mic Button - disabled placeholder */}
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl p-2 text-slate-300 opacity-60"
                title="Use microphone (coming soon)"
              >
                <span className="material-symbols-outlined text-[20px]">
                  mic
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-slate-500 sm:inline-block">
                {isSubmitting ? "Creating project..." : "Press Enter to submit"}
              </span>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim() || isSubmitting}
                className={`flex items-center justify-center rounded-2xl p-2.5 shadow-lg transition-all ${value.trim() && !isSubmitting
                  ? "bg-[#2f8fff] text-white shadow-[0_18px_30px_-18px_rgba(47,143,255,0.6)] hover:bg-[#267ce6] cursor-pointer"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                title={isSubmitting ? "Creating..." : "Submit"}
              >
                <span className={`material-symbols-outlined text-[20px] ${isSubmitting ? "animate-spin" : ""}`}>
                  {isSubmitting ? "hourglass_top" : "arrow_upward"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Character count indicator */}
      {value.length > 0 && (
        <div className="absolute -bottom-6 right-2 text-xs text-slate-500">
          {value.length} characters
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
