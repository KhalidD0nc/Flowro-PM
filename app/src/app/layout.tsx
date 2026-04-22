import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/components/Providers";
import Analytics from "@/components/Analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";

// Viewport configuration for mobile keyboard handling
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content", // Prevents chat input from being hidden by mobile keyboard
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Flowro AI: Unified Blueprint Engine",
    template: "%s | Flowro AI",
  },
  description:
    "Transform messy ideas into structured, agent-ready project blueprints. AI-powered product management for builders using Cursor, Claude, and Windsurf.",
  keywords: [
    "AI product management",
    "blueprint engine",
    "project planning",
    "unified blueprint",
    "AI agent",
    "product specification",
    "cursor ai",
    "claude code",
    "windsurf",
    "vibe coding",
  ],
  authors: [{ name: "Flowro AI" }],
  creator: "Flowro AI",
  publisher: "Flowro AI",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://flowro.ai",
    siteName: "Flowro AI",
    title: "Flowro AI: Unified Blueprint Engine",
    description:
      "Transform messy ideas into structured, agent-ready project blueprints",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Flowro AI - Transform ideas into blueprints",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Flowro AI: Unified Blueprint Engine",
    description:
      "Transform messy ideas into structured, agent-ready project blueprints",
    images: ["/og-image.png"],
    creator: "@flowroai",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://flowro.ai"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} bg-background-light font-sans antialiased text-slate-900`}>
        <Analytics />
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
        <VercelAnalytics />
      </body>
    </html>
  );
}
