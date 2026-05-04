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
import { ArrowUp, Hourglass, Mic, Paperclip } from "lucide-react";

interface VisionInputProps {
  onProjectCreated?: (projectId: string, initialMessage: string) => void;
}

const PROMPT_EXAMPLES = [
  "a landing page",
  "a SaaS dashboard",
  "a marketplace",
  "an onboarding flow",
];

export default function VisionInput({ onProjectCreated }: VisionInputProps) {
  const { user } = useAuth();

  // Local UI state
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typedPrompt, setTypedPrompt] = useState(PROMPT_EXAMPLES[0]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedPrompt(PROMPT_EXAMPLES[0]);
      return;
    }

    let exampleIndex = 0;
    let charIndex = PROMPT_EXAMPLES[0].length;
    let deleting = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const currentExample = PROMPT_EXAMPLES[exampleIndex];
      let nextDelay = 58;

      if (deleting) {
        charIndex -= 1;
        setTypedPrompt(currentExample.slice(0, Math.max(charIndex, 0)));
        nextDelay = 42;

        if (charIndex <= 0) {
          deleting = false;
          exampleIndex = (exampleIndex + 1) % PROMPT_EXAMPLES.length;
          nextDelay = 180;
        }
      } else {
        const nextExample = PROMPT_EXAMPLES[exampleIndex];
        charIndex += 1;
        setTypedPrompt(nextExample.slice(0, charIndex));
        nextDelay = 58;

        if (charIndex >= nextExample.length) {
          deleting = true;
          nextDelay = 1350;
        }
      }

      timeoutId = setTimeout(tick, nextDelay);
    };

    timeoutId = setTimeout(tick, 1250);
    return () => clearTimeout(timeoutId);
  }, [prefersReducedMotion]);

  // Listen for placeholder/vision update events from quick actions
  useEffect(() => {
    const handleSetPlaceholder = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
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
    <div className="group relative w-full">
      <div
        className={`relative rounded-[1.75rem] border border-white/[0.09] bg-[#11151d]/95 p-2 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.95)] transition-[border-color,box-shadow] duration-300 ${isFocused ? "border-[#2f8fff]/55 shadow-[0_32px_100px_-58px_rgba(47,143,255,0.75)]" : ""
          }`}
      >
        <div className="relative flex flex-col">
          {!value ? (
            <div className="pointer-events-none absolute left-5 right-5 top-4 flex min-h-[32px] flex-wrap items-center gap-x-1.5 text-lg leading-relaxed text-slate-400">
              <span>Ask Flowro to make</span>
              <span className="text-slate-200">{typedPrompt}</span>
              {!prefersReducedMotion ? (
                <span className="mb-0.5 inline-block h-5 w-px translate-y-0.5 bg-[#2f8fff]/90" aria-hidden="true" />
              ) : null}
            </div>
          ) : null}

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            dir="auto"
            aria-label="Describe what Flowro should make"
            className="flowro-bidi-text min-h-[92px] max-h-[220px] w-full resize-none border-0 bg-transparent px-5 py-4 text-lg leading-relaxed text-white caret-[#2f8fff] placeholder:text-transparent focus:outline-none focus:ring-0 disabled:opacity-50"
            placeholder="Ask Flowro to make a landing page"
            rows={2}
          />

          <div className="flex items-center justify-between px-2 pb-1 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="flex size-11 cursor-not-allowed items-center justify-center rounded-xl text-slate-500 opacity-70"
                title="Attach file (coming soon)"
                aria-label="Attach file coming soon"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                disabled
                className="flex size-11 cursor-not-allowed items-center justify-center rounded-xl text-slate-500 opacity-70"
                title="Use microphone (coming soon)"
                aria-label="Use microphone coming soon"
              >
                <Mic size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-slate-500 sm:inline-block">
                {isSubmitting ? "Creating project..." : "Press Enter to submit"}
              </span>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim() || isSubmitting}
                className={`flex size-11 items-center justify-center rounded-2xl shadow-lg transition-colors ${value.trim() && !isSubmitting
                  ? "cursor-pointer bg-[#2f8fff] text-white shadow-[0_18px_30px_-18px_rgba(47,143,255,0.85)] hover:bg-[#267ce6]"
                  : "cursor-not-allowed bg-white/[0.08] text-slate-500 shadow-none"
                  }`}
                title={isSubmitting ? "Creating..." : "Submit"}
                aria-label={isSubmitting ? "Creating project" : "Submit"}
              >
                {isSubmitting ? <Hourglass className="animate-spin" size={18} /> : <ArrowUp size={19} />}
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
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm text-red-300">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
