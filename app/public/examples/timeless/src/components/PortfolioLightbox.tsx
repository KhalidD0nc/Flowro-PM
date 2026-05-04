import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, Tag } from 'lucide-react';
import type { PortfolioItem } from '../lib/mock-data';

export function PortfolioLightbox({
  item,
  open,
  onClose
}: {
  item: PortfolioItem | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex bg-[hsl(var(--background))] p-4 lg:p-12"
        >
          <div className="absolute top-6 right-6 lg:top-8 lg:right-12 z-10">
            <button
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--surface-elevated))] text-[hsl(var(--ink))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-text))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
              title="Close Gallery"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex h-full w-full flex-col lg:flex-row gap-8 lg:gap-16 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0 pb-12 lg:pb-0 hide-scrollbar">
            <div className="lg:w-2/3 h-full flex items-center justify-center">
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                src={item.imageUrl}
                alt={item.title}
                className="max-h-full w-full max-w-5xl object-contain object-center shadow-2xl"
              />
            </div>
            
            <div className="lg:w-1/3 flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-md"
              >
                <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--accent))]">
                  Case Study
                </span>
                <h2 className="mt-4 font-serif text-4xl lg:text-5xl font-bold text-[hsl(var(--ink))]">
                  {item.title}
                </h2>
                <div className="mt-6 flex flex-wrap gap-4 text-sm text-[hsl(var(--ink-secondary))]">
                  <div className="flex items-center gap-1.5"><Tag className="h-4 w-4" /> {item.category}</div>
                  <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {item.location}</div>
                  <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {item.yearCompleted}</div>
                </div>
                <div className="mt-8 border-t border-[hsl(var(--line))] pt-8">
                  <p className="text-base leading-relaxed text-[hsl(var(--ink-muted))]">
                    {item.summary}
                  </p>
                </div>
                <button
                  className="mt-12 group flex items-center gap-3 text-sm font-medium uppercase tracking-widest text-[hsl(var(--ink))] hover:text-[hsl(var(--accent))] transition-colors"
                  onClick={onClose}
                >
                  <span className="block h-px w-8 bg-[hsl(var(--ink))] group-hover:bg-[hsl(var(--accent))] transition-colors"></span>
                  Return to Overview
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
