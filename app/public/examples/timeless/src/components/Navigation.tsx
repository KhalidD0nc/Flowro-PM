import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/app-kit';
import { Menu, X } from 'lucide-react';

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: "Expertise", href: "/#expertise" },
    { label: "Portfolio", href: "/#portfolio" },
    { label: "Process", href: "/#process" },
    { label: "App", href: "/app" },
  ];

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${isScrolled ? "bg-[hsl(var(--background))/0.9] backdrop-blur-md border-b border-[hsl(var(--line-faint))]" : "bg-transparent"}`}>
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="group flex items-center gap-2">
            <div className="h-6 w-6 bg-[hsl(var(--ink))] flex items-center justify-center transition-transform group-hover:scale-95">
              <span className="block h-2 w-2 rounded-full bg-[hsl(var(--background))]" />
            </div>
            <span className="font-serif text-lg font-bold tracking-widest text-[hsl(var(--ink))] uppercase">Timeless</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium uppercase tracking-widest text-[hsl(var(--ink-secondary))] hover:text-[hsl(var(--accent))] transition-colors">
                {link.label}
              </a>
            ))}
            <Link to="/book-consultation">
              <Button size="sm" className="hidden lg:inline-flex rounded-full">Start a Project</Button>
            </Link>
          </nav>

          <button className="md:hidden text-[hsl(var(--ink))]" onClick={() => setMobileMenuOpen(true)} title="Open Menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[hsl(var(--background))] p-6 flex flex-col">
          <div className="flex h-20 items-center justify-between -mt-6">
            <span className="font-serif text-lg font-bold tracking-widest text-[hsl(var(--ink))] uppercase">Timeless</span>
            <button className="text-[hsl(var(--ink))]" onClick={() => setMobileMenuOpen(false)} title="Close Menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-8 flex flex-col gap-6">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-2xl font-serif text-[hsl(var(--ink))]">
                {link.label}
              </a>
            ))}
            <Link to="/book-consultation" className="mt-4">
              <Button size="lg" className="w-full justify-center">Start a Project</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[hsl(var(--line-faint))] bg-[hsl(var(--surface))]">
      <div className="mx-auto max-w-[1440px] px-6 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-[hsl(var(--ink))] flex items-center justify-center">
                <span className="block h-2 w-2 rounded-full bg-[hsl(var(--background))]" />
              </div>
              <span className="font-serif text-lg font-bold tracking-widest text-[hsl(var(--ink))] uppercase">Timeless</span>
            </div>
            <p className="max-w-md text-sm text-[hsl(var(--ink-muted))] leading-relaxed">
              Designing and building monumental spaces for private clients and commercial developers globally. Uncompromising precision in every detail.
            </p>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-4 text-[hsl(var(--ink))]">Inquiries</h4>
            <ul className="flex flex-col gap-2 text-sm text-[hsl(var(--ink-muted))]">
              <li>projects@timeless.studio</li>
              <li>press@timeless.studio</li>
              <li>+1 (800) 555-0199</li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-4 text-[hsl(var(--ink))]">Locations</h4>
            <ul className="flex flex-col gap-2 text-sm text-[hsl(var(--ink-muted))]">
              <li>New York</li>
              <li>London</li>
              <li>Dubai</li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between border-t border-[hsl(var(--line))] pt-8 text-xs text-[hsl(var(--ink-muted))]">
          <p>© 2026 Timeless Spaces Studio. All rights reserved.</p>
          <div className="mt-4 sm:mt-0 flex gap-4">
            <a href="#" className="hover:text-[hsl(var(--ink))] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[hsl(var(--ink))] transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
