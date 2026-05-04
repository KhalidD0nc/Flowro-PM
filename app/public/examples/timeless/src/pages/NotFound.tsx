import { useNavigate } from 'react-router-dom';
import { FadeIn, Button } from '../components/ui/app-kit';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader, SiteFooter } from '../components/Navigation';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center px-6 py-32">
        <FadeIn>
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--accent))]">
              Error 404
            </span>
            <h1 className="mt-6 font-serif text-6xl lg:text-8xl font-bold text-[hsl(var(--ink))]">
              Void.
            </h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-[hsl(var(--ink-muted))]">
              The architectural path you attempted to trace does not exist within our bluepints.
            </p>
            <div className="mt-12">
              <Button size="lg" onClick={() => navigate("/")} className="tracking-widest uppercase text-xs">
                <ArrowLeft className="mr-3 h-4 w-4" /> Return to Overview
              </Button>
            </div>
          </div>
        </FadeIn>
      </main>
      <SiteFooter />
    </div>
  );
}
