"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader, SiteFooter } from '@/components/examples/timeless/navigation';
import { Input, Label, Textarea, Select, Button, Reveal, FadeIn } from '@/components/examples/timeless/app-kit';

export default function ConsultationBookingPage() {
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => setSubmitted(true), 800);
  };

  return (
    <div style={{ backgroundColor: 'var(--background)' }} className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-grow pt-24 pb-24 lg:pt-32">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-32">

            <FadeIn direction="right" duration={0.8} delay={0.1}>
              <div className="max-w-xl lg:sticky lg:top-32">
                <span style={{ color: 'var(--accent)' }} className="text-xs font-semibold uppercase tracking-widest">Discovery Phase</span>
                <h1 style={{ color: 'var(--ink)' }} className="mt-6 font-serif text-4xl lg:text-6xl leading-tight">
                  Let&apos;s define your space.
                </h1>
                <p style={{ color: 'var(--ink-muted)' }} className="mt-6 text-lg leading-relaxed">
                  Provide initial details surrounding your intent. Our lead architects review every submission personally to ensure our capabilities align with your ambitions before scheduling a formal dialogue.
                </p>
                <div style={{ borderTopColor: 'var(--line)', color: 'var(--ink-secondary)' }} className="mt-16 space-y-8 border-t pt-8">
                  <div>
                    <h3 style={{ color: 'var(--ink)' }} className="text-xs uppercase tracking-widest font-semibold mb-2">Direct Line</h3>
                    <p className="font-serif text-xl">+1 (800) 555-0199</p>
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--ink)' }} className="text-xs uppercase tracking-widest font-semibold mb-2">Global Headquarters</h3>
                    <p>The Monolith Tower, Level 42<br />New York, NY 10014</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} duration={0.8}>
              <div style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--line-faint)' }} className="p-8 lg:p-12 border shadow-xl">
                {submitted ? (
                  <div className="text-center py-24">
                    <h2 style={{ color: 'var(--ink)' }} className="font-serif text-3xl">Inquiry Received</h2>
                    <p style={{ color: 'var(--ink-muted)' }} className="mt-4">We have securely transmitted your details to our principals. Expect correspondence within 48 hours.</p>
                    <button style={{ color: 'var(--accent)' }} className="mt-8 text-sm uppercase tracking-widest hover:opacity-70 transition-opacity" onClick={() => router.push("/examples/timeless")}>
                      Return to Overview
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 sm:col-span-1 space-y-2">
                        <Label>First Name</Label>
                        <Input required placeholder="Jonathan" />
                      </div>
                      <div className="col-span-2 sm:col-span-1 space-y-2">
                        <Label>Last Name</Label>
                        <Input required placeholder="Mercer" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" required placeholder="director@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input type="tel" placeholder="+1 (555) 000-0000" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 sm:col-span-1 space-y-2">
                        <Label>Project Type</Label>
                        <Select required>
                          <option value="">Select an option</option>
                          <option value="residential">Residential Architecture</option>
                          <option value="commercial">Commercial Development</option>
                          <option value="interior">Interior Masterplan</option>
                          <option value="renovation">Historical Renovation</option>
                        </Select>
                      </div>
                      <div className="col-span-2 sm:col-span-1 space-y-2">
                        <Label>Estimated Capital</Label>
                        <Select required>
                          <option value="">Select an option</option>
                          <option value="1">Under $1M</option>
                          <option value="5">$1M - $5M</option>
                          <option value="10">$5M - $10M</option>
                          <option value="20">$10M+</option>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Project Vision / Summary</Label>
                      <Textarea required placeholder="Describe the site, architectural intent, and desired outcomes." />
                    </div>
                    <Button type="submit" size="lg" className="w-full tracking-widest uppercase text-xs mt-4">
                      Submit Inquiry for Review
                    </Button>
                  </form>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
