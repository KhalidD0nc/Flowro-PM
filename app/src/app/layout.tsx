import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/Providers";
import Analytics from "@/components/Analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background-dark text-white`}>
        <Analytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
