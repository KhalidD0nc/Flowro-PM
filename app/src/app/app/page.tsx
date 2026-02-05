/**
 * Command Center — Authenticated Home
 * 
 * Main dashboard for authenticated users.
 * Seamlessly transitions between Command Center and Chat views.
 * Redirects to /auth if not logged in.
 */

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/Providers";
import Sidebar from "@/components/home/Sidebar";
import CommandCenter from "@/components/home/CommandCenter";
import ChatView from "@/components/home/ChatView";

// Active session state for seamless transitions
interface ActiveSession {
  projectId: string;
  initialMessage: string;
  isExisting?: boolean; // true when loading an existing project from sidebar
}

function AppHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  // Active session state - when set, shows ChatView instead of CommandCenter
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Redirect unauthenticated users to auth
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  // Handle project creation - seamless transition to chat
  const handleProjectCreated = useCallback((projectId: string, initialMessage: string) => {
    setIsTransitioning(true);

    // Update URL without navigation (for bookmarking/sharing)
    window.history.replaceState(null, "", `/app/${projectId}`);

    // Small delay for smooth transition
    setTimeout(() => {
      setActiveSession({ projectId, initialMessage });
      setIsTransitioning(false);
    }, 150);
  }, []);

  // Handle back to Command Center
  const handleBackToCommandCenter = useCallback(() => {
    setIsTransitioning(true);

    // Reset URL
    window.history.replaceState(null, "", "/app");

    setTimeout(() => {
      setActiveSession(null);
      setIsTransitioning(false);
    }, 150);
  }, []);

  // Handle project selection from sidebar
  const handleProjectSelect = useCallback((projectId: string) => {
    // If already on this project, do nothing
    if (activeSession?.projectId === projectId) return;

    setIsTransitioning(true);

    // Update URL without navigation
    window.history.replaceState(null, "", `/app/${projectId}`);

    setTimeout(() => {
      setActiveSession({ projectId, initialMessage: "", isExisting: true });
      setIsTransitioning(false);
    }, 150);
  }, [activeSession?.projectId]);

  // Handle new chat from sidebar
  const handleNewChat = useCallback(() => {
    if (!activeSession) return; // Already on Command Center
    handleBackToCommandCenter();
  }, [activeSession, handleBackToCommandCenter]);

  // Allow direct /app/[projectId] refresh via redirect to /app?projectId=...
  useEffect(() => {
    if (loading || !user) return;
    const projectId = searchParams.get("projectId");
    if (!projectId) return;

    if (activeSession?.projectId === projectId) {
      window.history.replaceState(null, "", `/app/${projectId}`);
      return;
    }

    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSession({ projectId, initialMessage: "", isExisting: true });
      setIsTransitioning(false);
      window.history.replaceState(null, "", `/app/${projectId}`);
    }, 150);
  }, [activeSession?.projectId, loading, searchParams, user]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020204] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.svg" alt="Flowro Logo" className="w-16 h-16 animate-spin" />
          <span className="text-[#9dabb9] text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#020204] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.svg" alt="Flowro Logo" className="w-16 h-16 animate-spin" />
          <span className="text-[#9dabb9] text-sm animate-pulse">
            Redirecting to login...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-row bg-[#020204] font-sans text-white overflow-hidden selection:bg-violet-500/30 selection:text-white premium-bg">
      {/* Sidebar Navigation - Always visible */}
      <Sidebar
        onProjectSelect={handleProjectSelect}
        onNewChat={handleNewChat}
        activeProjectId={activeSession?.projectId || null}
      />

      {/* Main Content Area with seamless transitions */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Transition overlay */}
        <div
          className={`absolute inset-0 bg-[#020204] pointer-events-none z-50 transition-opacity duration-150 ${isTransitioning ? "opacity-100" : "opacity-0"
            }`}
        />

        {/* Content: CommandCenter or ChatView */}
        {activeSession ? (
          <ChatView
            key={activeSession.projectId}
            projectId={activeSession.projectId}
            initialMessage={activeSession.initialMessage}
            user={user}
            onBack={handleBackToCommandCenter}
            isExisting={activeSession.isExisting}
          />
        ) : (
          <CommandCenter onProjectCreated={handleProjectCreated} />
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#020204] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.svg" alt="Flowro Logo" className="w-16 h-16 animate-spin" />
        <span className="text-[#9dabb9] text-sm">Loading...</span>
      </div>
    </div>
  );
}

export default function AppHome() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppHomeContent />
    </Suspense>
  );
}
