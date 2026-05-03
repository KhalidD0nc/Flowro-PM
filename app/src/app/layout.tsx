import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk, Geist } from "next/font/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import "./globals.css";
import Analytics from "@/components/Analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


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
    default: "Flowro: Open-Source Plan-to-App Builder",
    template: "%s | Flowro",
  },
  description:
    "Open-source, self-hosted plan-to-app builder that turns messy ideas into approved plans, local build runs, and previewable apps.",
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
  authors: [{ name: "Flowro" }],
  creator: "Flowro",
  publisher: "Flowro",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://flowro.app",
    siteName: "Flowro",
    title: "Flowro: Open-Source Plan-to-App Builder",
    description:
      "Self-hosted builder pipeline from messy idea to approved plan, local build worker, and preview.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Flowro open-source plan-to-app builder",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Flowro: Open-Source Plan-to-App Builder",
    description:
      "Self-hosted builder pipeline from messy idea to approved plan, local build worker, and preview.",
    images: ["/logo.png"],
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
    process.env.NEXT_PUBLIC_APP_URL || "https://flowro.app"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("scroll-smooth", "font-sans", geist.variable)}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} bg-background font-sans antialiased text-foreground`}>
        <Analytics />
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
        <VercelAnalytics />
      </body>
    </html>
  );
}
