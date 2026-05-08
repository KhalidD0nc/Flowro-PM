/**
 * Phase 3.B — Fully Functional Vision Input
 *
 * Controlled textarea with focus glow effect.
 * Creates project and calls onProjectCreated callback for seamless transition.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/Providers";
import { authPost } from "@/lib/authFetch";
import type { ProjectType, SlidesSourceInput } from "@/lib/slides/schema";
import { AppWindow, ArrowUp, Globe2, Hourglass, LinkIcon, Mic, Paperclip, Presentation, X } from "lucide-react";

interface VisionInputProps {
  onProjectCreated?: (projectId: string, initialMessage: string, projectType: ProjectType) => void;
  defaultProjectType?: ProjectType;
}

const PROMPT_EXAMPLES = [
  "a landing page",
  "a SaaS dashboard",
  "a marketplace",
  "a presentation about growth",
];

const CREATION_MODES = [
  { key: "app", label: "Apps", icon: AppWindow },
  { key: "slides", label: "Slides", icon: Presentation },
] as const;

const MAX_PREVIEW_IMAGE_BYTES = 8_000_000;
const MAX_INLINE_IMAGE_CHARS = 900_000;
const MAX_IMAGE_EDGE = 1280;

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sourceKindForFile(file: File): SlidesSourceInput["kind"] {
  return file.type.startsWith("image/") ? "image" : "file";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read image source."));
    };
    reader.onerror = () => reject(new Error("Unable to read image source."));
    reader.readAsDataURL(file);
  });
}

function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

async function previewDataUrlForImage(file: File): Promise<string | null> {
  if (file.size > MAX_PREVIEW_IMAGE_BYTES) return null;

  const dataUrl = await readFileAsDataUrl(file);
  if (dataUrl.length <= MAX_INLINE_IMAGE_CHARS) return dataUrl;

  const dimensions = await imageDimensions(dataUrl);
  if (!dimensions.width || !dimensions.height) return null;

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(dimensions.width, dimensions.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(dimensions.width * scale));
  canvas.height = Math.max(1, Math.round(dimensions.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;

  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    image.onerror = () => reject(new Error("Unable to compress image."));
    image.src = dataUrl;
  });

  const compressed = canvas.toDataURL("image/jpeg", 0.78);
  return compressed.length <= MAX_INLINE_IMAGE_CHARS ? compressed : null;
}

export default function VisionInput({ onProjectCreated, defaultProjectType = "app" }: VisionInputProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local UI state
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typedPrompt, setTypedPrompt] = useState(PROMPT_EXAMPLES[0]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ProjectType>(defaultProjectType);
  const [sourceInputs, setSourceInputs] = useState<SlidesSourceInput[]>([]);
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    setSelectedMode(defaultProjectType);
  }, [defaultProjectType]);

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
        projectType: selectedMode,
        slidesSources: selectedMode === "slides" ? sourceInputs : undefined,
        slidesWebSearchEnabled: selectedMode === "slides" ? webSearchEnabled : undefined,
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
        onProjectCreated(id, value.trim(), selectedMode);
      }
    } catch {
      setError("Failed to create project. Please try again.");
      setIsSubmitting(false);
    }
  }, [value, isSubmitting, user, selectedMode, sourceInputs, webSearchEnabled, onProjectCreated]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    const nextSources = await Promise.all(Array.from(files).map(async (file): Promise<SlidesSourceInput> => {
      const base: SlidesSourceInput = {
        id: createClientId(),
        kind: sourceKindForFile(file),
        name: file.name,
        mimeType: file.type || undefined,
        size: file.size,
      };
      if (base.kind !== "image") return base;

      try {
        const dataUrl = await previewDataUrlForImage(file);
        if (!dataUrl) return base;
        const dimensions = await imageDimensions(dataUrl);
        return {
          ...base,
          dataUrl,
          ...(dimensions.width > 0 ? { width: dimensions.width } : {}),
          ...(dimensions.height > 0 ? { height: dimensions.height } : {}),
        };
      } catch {
        return base;
      }
    }));
    setSourceInputs((current) => [...current, ...nextSources].slice(0, 12));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddLink = () => {
    const trimmed = linkValue.trim();
    if (!trimmed) return;

    try {
      const url = new URL(trimmed);
      const nextSource: SlidesSourceInput = {
        id: createClientId(),
        kind: "link",
        name: url.hostname.replace(/^www\./, "") || trimmed,
        url: url.toString(),
      };
      setSourceInputs((current) => [
        ...current,
        nextSource,
      ].slice(0, 12));
      setLinkValue("");
      setIsLinkInputOpen(false);
      setError(null);
    } catch {
      setError("Enter a valid source link.");
    }
  };

  const removeSource = (sourceId: string) => {
    setSourceInputs((current) => current.filter((source) => source.id !== sourceId));
  };

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
        className={`relative rounded-[2.05rem] border border-[#3b3935] bg-[#252522]/96 p-2 shadow-[0_30px_90px_-52px_rgba(0,0,0,0.92)] transition-[border-color,box-shadow,transform] duration-300 ${isFocused ? "border-[#6f82ff]/65 shadow-[0_34px_100px_-58px_rgba(111,130,255,0.72)]" : ""
          }`}
      >
        <div className="relative flex flex-col">
          {!value ? (
            <div className="pointer-events-none absolute left-6 right-6 top-5 flex min-h-[32px] flex-wrap items-center gap-x-1.5 text-lg font-medium leading-relaxed text-[#aaa6a1]">
              <span>Ask Flowro to make</span>
              <span className="text-[#e6e2dc]">{typedPrompt}</span>
              {!prefersReducedMotion ? (
                <span className="mb-0.5 inline-block h-5 w-px translate-y-0.5 bg-[#6f82ff]/90" aria-hidden="true" />
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
            className="flowro-bidi-text min-h-[104px] max-h-[220px] w-full resize-none border-0 bg-transparent px-6 py-5 text-lg font-medium leading-relaxed text-white caret-[#6f82ff] placeholder:text-transparent focus:outline-none focus:ring-0 disabled:opacity-50"
            placeholder="Ask Flowro to make a landing page"
            rows={2}
          />

          <div className="flex items-center justify-between px-3 pb-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedMode !== "slides" || isSubmitting}
                className="flex size-10 items-center justify-center rounded-xl text-[#c7c0b8] opacity-80 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:text-[#8b8782]"
                title={selectedMode === "slides" ? "Attach slide sources" : "Switch to Slides to attach sources"}
                aria-label="Attach slide sources"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.csv,.tsv,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.svg,image/*"
                onChange={(event) => handleFilesSelected(event.target.files)}
              />

              <button
                type="button"
                onClick={() => setIsLinkInputOpen((current) => !current)}
                disabled={selectedMode !== "slides" || isSubmitting}
                className="flex size-10 items-center justify-center rounded-xl text-[#c7c0b8] opacity-80 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:text-[#8b8782]"
                title={selectedMode === "slides" ? "Add source link" : "Switch to Slides to add links"}
                aria-label="Add source link"
              >
                <LinkIcon size={18} />
              </button>

              <button
                type="button"
                disabled
                className="flex size-10 cursor-not-allowed items-center justify-center rounded-xl text-[#8b8782] opacity-75"
                title="Use microphone (coming soon)"
                aria-label="Use microphone coming soon"
              >
                <Mic size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-[#8b8782] sm:inline-block">
                {isSubmitting ? "Creating project..." : selectedMode === "slides" ? "Create slides workspace" : "Press Enter to submit"}
              </span>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim() || isSubmitting}
                className={`flex size-11 items-center justify-center rounded-full shadow-lg transition-colors ${value.trim() && !isSubmitting
                  ? "cursor-pointer bg-[#263a92] text-white shadow-[0_18px_30px_-18px_rgba(55,75,180,0.9)] hover:bg-[#3048ad]"
                  : "cursor-not-allowed bg-[#34332f] text-[#77726b] shadow-none"
                  }`}
                title={isSubmitting ? "Creating..." : "Submit"}
                aria-label={isSubmitting ? "Creating project" : "Submit"}
              >
                {isSubmitting ? <Hourglass className="animate-spin" size={18} /> : <ArrowUp size={19} />}
              </button>
            </div>
          </div>

          {selectedMode === "slides" ? (
            <div className="border-t border-white/[0.06] px-3 pb-3 pt-3">
              {isLinkInputOpen ? (
                <div className="mb-3 flex gap-2">
                  <input
                    value={linkValue}
                    onChange={(event) => setLinkValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddLink();
                      }
                    }}
                    placeholder="https://example.com/report"
                    aria-label="Source link"
                    className="min-h-10 flex-1 rounded-xl border border-white/[0.09] bg-[#1e1f1d] px-3 text-sm text-white outline-none placeholder:text-[#77726b] focus:border-[#6f82ff]/60"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="min-h-10 rounded-xl bg-[#34332f] px-3 text-sm font-semibold text-white transition hover:bg-[#42413c]"
                  >
                    Add
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled((current) => !current)}
                  aria-pressed={webSearchEnabled}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                    webSearchEnabled
                      ? "border-[#6f82ff]/45 bg-[#6f82ff]/14 text-[#dce4ff]"
                      : "border-white/[0.08] bg-[#1e1f1d] text-[#aaa6a1] hover:bg-white/[0.06]"
                  }`}
                >
                  <Globe2 size={15} />
                  Web search
                </button>

                {sourceInputs.map((source) => (
                  <span
                    key={source.id}
                    className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-[#1e1f1d] px-3 text-xs font-medium text-[#d8d8d5]"
                  >
                    <span className="max-w-[12rem] truncate">{source.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSource(source.id)}
                      className="-mr-1 flex size-5 items-center justify-center rounded-full text-[#8b8782] hover:bg-white/[0.08] hover:text-white"
                      aria-label={`Remove ${source.name}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex w-full justify-center">
        <div className="flex items-center gap-5 sm:gap-8">
          {CREATION_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setSelectedMode(mode.key)}
                className="group/mode flex flex-col items-center gap-2 text-sm font-semibold text-white/74 transition-colors hover:text-white"
                aria-pressed={isSelected}
              >
                <span
                  className={`flex size-16 items-center justify-center rounded-[1.35rem] border transition-colors sm:size-[72px] ${
                    isSelected
                      ? "border-white/[0.18] bg-[#262628] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_40px_-28px_rgba(0,0,0,0.85)]"
                      : "border-white/[0.11] bg-[#222225]/72 text-white/70 group-hover/mode:bg-[#2a2a2d]"
                  }`}
                >
                  <Icon size={24} strokeWidth={1.8} />
                </span>
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Character count indicator */}
      {value.length > 0 && (
        <div className="mt-2 text-right text-xs text-white/45">
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
