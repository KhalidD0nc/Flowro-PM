"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/examples/timeless/app-kit';
import { Menu, X } from 'lucide-react';

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const navLinks = [
    { label: "Expertise", href: "/examples/timeless#expertise" },
    { label: "Portfolio", href: "/examples/timeless#portfolio" },
    { label: "Process",   href: "/examples/timeless#process" },
    { label: "App",       href: "/examples/timeless/app" },
  ];

  return (
    <header
      style={isScrolled ? { borderBottomColor: 'var(--line-faint)', backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)' } : {}}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${isScrolled ? "backdrop-blur-md border-b" : "bg-transparent"}`}
    >
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="flex h-20 items-center justify-between">
          <Link href="/examples/timeless" className="group flex items-center gap-2">
            <div style={{ backgroundColor: 'var(--ink)' }} className="h-6 w-6 flex items-center justify-center transition-transform group-hover:scale-95">
              <span style={{ backgroundColor: 'var(--background)' }} className="block h-2 w-2 rounded-full" />
            </div>
            <span style={{ color: 'var(--ink)' }} className="font-serif text-lg font-bold tracking-widest uppercase">Timeless</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} style={{ color: 'var(--ink-secondary)' }} className="text-sm font-medium uppercase tracking-widest hover:opacity-100 transition-opacity opacity-80">
                {link.label}
              </Link>
            ))}
            <Link href="/examples/timeless/book-consultation">
              <Button size="sm" className="hidden lg:inline-flex rounded-full text-xs tracking-widest uppercase">Start a Project</Button>
            </Link>
          </nav>

          <button style={{ color: 'var(--ink)' }} className="md:hidden" onClick={() => setMobileMenuOpen(true)} title="Open Menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div style={{ backgroundColor: 'var(--background)' }} className="fixed inset-0 z-50 p-6 flex flex-col">
          <div className="flex h-20 items-center justify-between -mt-6">
            <span style={{ color: 'var(--ink)' }} className="font-serif text-lg font-bold tracking-widest uppercase">Timeless</span>
            <button style={{ color: 'var(--ink)' }} onClick={() => setMobileMenuOpen(false)} title="Close Menu"><X className="h-6 w-6" /></button>
          </div>
          <nav className="mt-8 flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} style={{ color: 'var(--ink)' }} className="text-2xl font-serif">{link.label}</Link>
            ))}
            <Link href="/examples/timeless/book-consultation" className="mt-4">
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
    <footer style={{ borderTopColor: 'var(--line-faint)', backgroundColor: 'var(--surface)' }} className="border-t">
      <div className="mx-auto max-w-[1440px] px-6 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div style={{ backgroundColor: 'var(--ink)' }} className="h-6 w-6 flex items-center justify-center">
                <span style={{ backgroundColor: 'var(--background)' }} className="block h-2 w-2 rounded-full" />
              </div>
              <span style={{ color: 'var(--ink)' }} className="font-serif text-lg font-bold tracking-widest uppercase">Timeless</span>
            </div>
            <p style={{ color: 'var(--ink-muted)' }} className="max-w-md text-sm leading-relaxed">
              Designing and building monumental spaces for private clients and commercial developers globally. Uncompromising precision in every detail.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--ink)' }} className="font-serif text-lg mb-4">Inquiries</h4>
            <ul style={{ color: 'var(--ink-muted)' }} className="flex flex-col gap-2 text-sm">
              <li>projects@timeless.studio</li>
              <li>press@timeless.studio</li>
              <li>+1 (800) 555-0199</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'var(--ink)' }} className="font-serif text-lg mb-4">Locations</h4>
            <ul style={{ color: 'var(--ink-muted)' }} className="flex flex-col gap-2 text-sm">
              <li>New York</li><li>London</li><li>Dubai</li>
            </ul>
          </div>
        </div>
        <div style={{ borderTopColor: 'var(--line)', color: 'var(--ink-muted)' }} className="mt-16 flex flex-col sm:flex-row items-center justify-between border-t pt-8 text-xs">
          <p>© 2026 Timeless Spaces Studio. All rights reserved.</p>
          <div className="mt-4 sm:mt-0 flex gap-4">
            <a href="#" className="hover:opacity-100 opacity-70 transition-opacity">Privacy Policy</a>
            <a href="#" className="hover:opacity-100 opacity-70 transition-opacity">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
