"use client"

import PricingSection from "./PricingSection"

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="fixed top-6 right-6 z-[101] flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm"
          title="Close pricing"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
          <span className="text-sm font-medium hidden sm:inline">Close</span>
        </button>

        {/* Pricing Content */}
        <div className="pt-24 pb-12">
          <PricingSection />
        </div>
      </div>
    </div>
  )
}
