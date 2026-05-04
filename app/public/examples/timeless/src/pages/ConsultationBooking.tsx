import { useState } from 'react';
import { SiteHeader, SiteFooter } from '../components/Navigation';
import { Input, Label, Textarea, Select, Button, Reveal, FadeIn } from '../components/ui/app-kit';

export default function ConsultationBooking() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <SiteHeader />
      <main className="flex-grow pt-24 pb-24 lg:pt-32">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-32">
            
            <FadeIn direction="right" duration={0.8} delay={0.1}>
              <div className="max-w-xl sticky top-32">
                <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--accent))]">
                  Discovery Phase
                </span>
                <h1 className="mt-6 font-serif text-4xl lg:text-6xl text-[hsl(var(--ink))] leading-tight">
                  Let’s define your space.
                </h1>
                <p className="mt-6 text-lg text-[hsl(var(--ink-muted))] leading-relaxed">
                  Provide initial details surrounding your intent. Our lead architects review every submission personally to ensure our capabilities align with your ambitions before scheduling a formal dialogue.
                </p>
                <div className="mt-16 space-y-8 border-t border-[hsl(var(--line))] pt-8 text-[hsl(var(--ink-secondary))]">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest font-semibold text-[hsl(var(--ink))] mb-2">Direct Line</h3>
                    <p className="font-serif text-xl">+1 (800) 555-0199</p>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-widest font-semibold text-[hsl(var(--ink))] mb-2">Global Headquarters</h3>
                    <p>The Monolith Tower, Level 42<br/>New York, NY 10014</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} duration={0.8}>
              <div className="bg-[hsl(var(--surface-elevated))] p-8 lg:p-12 border border-[hsl(var(--line-faint))] shadow-xl">
                {submitted ? (
                  <div className="text-center py-24">
                    <h2 className="font-serif text-3xl text-[hsl(var(--ink))]">Inquiry Received</h2>
                    <p className="mt-4 text-[hsl(var(--ink-muted))]">We have securely transmitted your details to our principals. Expect correspondence within 48 hours.</p>
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
