"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import UBPViewer, { UBPContent } from "@/components/UBPViewer"

// Sample demo blueprint data
const demoBlueprints: Record<string, { name: string; description: string; content: UBPContent }> = {
    "demo-saas-startup": {
        name: "TaskFlow Pro",
        description: "AI-powered project management for agile teams",
        content: {
            productVision: {
                description: "TaskFlow Pro is an AI-powered project management platform that helps agile teams collaborate more effectively. It combines traditional task management with intelligent automation to reduce busywork and keep teams focused on what matters.",
                primaryGoal: "Reduce time spent on project administration by 50% through smart automation",
                targetAudience: "Small to medium agile software teams (5-50 members) who want to streamline their workflow"
            },
            scope: {
                inScope: [
                    "Task creation, assignment, and tracking",
                    "Sprint planning and backlog management",
                    "AI-powered task prioritization",
                    "Team collaboration features (comments, mentions)",
                    "Integration with GitHub and Slack",
                    "Basic reporting and analytics"
                ],
                outOfScope: [
                    "Time tracking and billing",
                    "Resource capacity planning",
                    "Custom workflow builder (v2)",
                    "Mobile native apps (PWA only for MVP)"
                ]
            },
            actors: [
                { name: "Team Member", description: "Creates and completes tasks, participates in sprints", icon: "person" },
                { name: "Project Manager", description: "Plans sprints, manages backlog, reviews progress", icon: "assignment_ind" },
                { name: "Admin", description: "Manages team settings, integrations, and billing", icon: "admin_panel_settings" },
                { name: "AI Assistant", description: "Provides suggestions, auto-prioritizes tasks", icon: "smart_toy" }
            ],
            behaviors: [
                {
                    id: "BH-01",
                    title: "Create Task with AI Suggestions",
                    priority: "P0",
                    given: "A team member is on the project board",
                    when: "They click 'New Task' and enter a description",
                    then: "AI suggests priority, story points, and assignee based on context"
                },
                {
                    id: "BH-02",
                    title: "Sprint Auto-Planning",
                    priority: "P0",
                    given: "A PM has tasks in the backlog",
                    when: "They click 'Plan Sprint' with AI assist",
                    then: "System suggests optimal task selection based on velocity and priorities"
                },
                {
                    id: "BH-03",
                    title: "Smart Notifications",
                    priority: "P1",
                    given: "A task is blocked or overdue",
                    when: "The system detects the blocker",
                    then: "Relevant stakeholders are notified with suggested actions"
                }
            ],
            constraints: [
                { type: "warning", title: "Performance Constraint", description: "Board must load within 2 seconds with up to 500 tasks visible" },
                { type: "warning", title: "Data Residency", description: "EU customers require data stored in EU regions (GDPR compliance)" },
                { type: "risk", title: "AI Accuracy", description: "AI suggestions may be inaccurate initially; need feedback loop for improvement" },
                { type: "risk", title: "Integration Dependencies", description: "GitHub/Slack API changes could break integrations" }
            ],
            techDecisions: [
                { category: "Frontend", choice: "Next.js 14 + React" },
                { category: "Backend", choice: "Node.js + tRPC" },
                { category: "Database", choice: "PostgreSQL + Prisma" },
                { category: "AI/ML", choice: "OpenAI API (GPT-4)" },
                { category: "Hosting", choice: "Vercel + Supabase" },
                { category: "Auth", choice: "Clerk" }
            ],
            phases: [
                {
                    name: "Phase 1: Core MVP",
                    timeline: "Weeks 1-4",
                    description: "Basic task management, user auth, and project boards",
                    status: "completed" as const
                },
                {
                    name: "Phase 2: AI Features",
                    timeline: "Weeks 5-8",
                    description: "AI suggestions, auto-prioritization, smart notifications",
                    status: "current" as const
                },
                {
                    name: "Phase 3: Integrations",
                    timeline: "Weeks 9-12",
                    description: "GitHub and Slack integrations, webhooks",
                    status: "upcoming" as const
                },
                {
                    name: "Phase 4: Beta Launch",
                    timeline: "Week 13",
                    description: "Public beta with feedback collection",
                    status: "upcoming" as const
                }
            ],
            integrations: [
                { system: "GitHub", method: "OAuth + Webhooks", purpose: "Link commits/PRs to tasks, auto-close tasks" },
                { system: "Slack", method: "Bot + Slash Commands", purpose: "Notifications, quick task creation" },
                { system: "OpenAI", method: "REST API", purpose: "AI suggestions and prioritization" }
            ],
            changelog: [
                { version: "0.3", title: "AI Prioritization", description: "Added AI-powered task prioritization based on team velocity", timestamp: "Today" },
                { version: "0.2", title: "Sprint Planning", description: "Implemented sprint creation and backlog management", timestamp: "Last week" },
                { version: "0.1", title: "Initial Blueprint", description: "Created initial product vision and scope", timestamp: "2 weeks ago" }
            ]
        }
    },
    "demo-mobile-app": {
        name: "FitTrack",
        description: "Personal fitness tracking and workout planning app",
        content: {
            productVision: {
                description: "FitTrack is a mobile fitness app that helps users track workouts, set goals, and stay motivated through personalized AI coaching.",
                primaryGoal: "Help users maintain consistent workout habits with 80% weekly engagement",
                targetAudience: "Health-conscious individuals aged 25-45 looking for a simple, effective fitness companion"
            },
            scope: {
                inScope: [
                    "Workout logging and tracking",
                    "Exercise library with instructions",
                    "Progress charts and statistics",
                    "Goal setting and reminders",
                    "AI-powered workout suggestions"
                ],
                outOfScope: [
                    "Nutrition tracking (v2)",
                    "Social features and challenges",
                    "Wearable device integrations",
                    "Personal trainer marketplace"
                ]
            },
            actors: [
                { name: "User", description: "Logs workouts, views progress, sets goals", icon: "fitness_center" },
                { name: "AI Coach", description: "Provides personalized recommendations", icon: "smart_toy" }
            ],
            behaviors: [
                {
                    id: "BH-01",
                    title: "Log Workout",
                    priority: "P0",
                    given: "User opens the app",
                    when: "They tap 'Start Workout' and complete exercises",
                    then: "Workout is saved with duration, exercises, and estimated calories"
                }
            ],
            constraints: [
                { type: "warning", title: "Offline Mode", description: "Core features must work without internet connection" }
            ],
            techDecisions: [
                { category: "Framework", choice: "React Native" },
                { category: "Backend", choice: "Firebase" },
                { category: "AI", choice: "OpenAI API" }
            ],
            phases: [
                {
                    name: "Phase 1: Core App",
                    timeline: "Weeks 1-6",
                    description: "Basic workout tracking and exercise library",
                    status: "current" as const
                }
            ],
            integrations: [
                { system: "Apple Health", method: "HealthKit API", purpose: "Sync workout data" }
            ],
            changelog: [
                { version: "0.1", title: "Initial Blueprint", description: "Created initial product vision", timestamp: "Today" }
            ]
        }
    }
}

export default function DemoProjectPage() {
    const params = useParams()
    const projectId = params.projectId as string
    const [isUBPViewerOpen, setIsUBPViewerOpen] = useState(true)

    const demo = demoBlueprints[projectId]

    if (!demo) {
        return (
            <div className="min-h-screen bg-[#101922] flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-[#9dabb9] text-5xl mb-4">science_off</span>
                <h1 className="text-white text-xl font-bold mb-2">Demo Not Found</h1>
                <p className="text-[#9dabb9] mb-6">This demo project doesn&apos;t exist.</p>
                <Link
                    href="/demo"
                    className="flex items-center gap-2 bg-[#137fec] text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to Demos
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#101922] flex flex-col">
            {/* Demo Banner */}
            <div className="bg-gradient-to-r from-[#137fec]/20 via-[#137fec]/10 to-[#137fec]/20 border-b border-[#137fec]/30 px-4 py-2">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#137fec] text-lg">science</span>
                        <span className="text-[#137fec] text-sm font-medium">Demo Mode</span>
                        <span className="text-[#9dabb9] text-sm hidden sm:inline">- Read-only preview</span>
                    </div>
                    <Link
                        href="/auth"
                        className="flex items-center gap-1 text-[#137fec] text-sm font-medium hover:text-blue-400 transition-colors"
                    >
                        Create your own
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                </div>
            </div>

            {/* Header */}
            <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#283039]">
                <div className="flex items-center gap-4">
                    <Link
                        href="/demo"
                        className="flex items-center justify-center rounded-lg p-2 text-[#9dabb9] hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-white text-lg font-bold">{demo.name}</h1>
                        <p className="text-[#9dabb9] text-sm">{demo.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsUBPViewerOpen(true)}
                        className="flex items-center gap-2 bg-[#137fec]/10 border border-[#137fec]/20 text-[#137fec] font-medium px-4 py-2 rounded-lg hover:bg-[#137fec]/20 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        <span className="hidden sm:inline">View Blueprint</span>
                    </button>
                </div>
            </header>

            {/* Main Content - Chat-like preview */}
            <main className="flex-1 p-4 sm:p-6 overflow-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Welcome message */}
                    <div className="flex justify-start mb-4">
                        <div className="bg-[#18212b] border border-[#283039] rounded-2xl px-4 py-3 max-w-[80%]">
                            <p className="text-white">
                                Welcome to the <span className="text-[#137fec] font-bold">{demo.name}</span> demo!
                                This is a sample blueprint showing how Flowro structures product specifications.
                            </p>
                            <button
                                onClick={() => setIsUBPViewerOpen(true)}
                                className="mt-3 flex items-center gap-2 bg-[#137fec]/20 hover:bg-[#137fec]/30 text-[#137fec] font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                Open Blueprint
                            </button>
                        </div>
                    </div>

                    {/* Feature highlights */}
                    <div className="bg-[#18212b]/50 border border-[#283039] rounded-xl p-6 mb-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#137fec]">auto_awesome</span>
                            What makes this blueprint special
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-green-400">check_circle</span>
                                <div>
                                    <p className="text-white text-sm font-medium">Complete 9-section structure</p>
                                    <p className="text-[#9dabb9] text-xs">Vision, scope, actors, behaviors, and more</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-green-400">check_circle</span>
                                <div>
                                    <p className="text-white text-sm font-medium">Agent-ready format</p>
                                    <p className="text-[#9dabb9] text-xs">Optimized for AI coding assistants</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-green-400">check_circle</span>
                                <div>
                                    <p className="text-white text-sm font-medium">Given-When-Then behaviors</p>
                                    <p className="text-[#9dabb9] text-xs">Clear, testable specifications</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-green-400">check_circle</span>
                                <div>
                                    <p className="text-white text-sm font-medium">Export to JSON/Markdown</p>
                                    <p className="text-[#9dabb9] text-xs">Use in your development workflow</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center py-8">
                        <h2 className="text-white text-2xl font-bold mb-2">Ready to create your own?</h2>
                        <p className="text-[#9dabb9] mb-6">
                            Sign up free and generate your first blueprint in minutes.
                        </p>
                        <Link
                            href="/auth"
                            className="inline-flex items-center gap-2 bg-[#137fec] text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-[#137fec]/20"
                        >
                            <span className="material-symbols-outlined text-[20px]">bolt</span>
                            Start Building Free
                        </Link>
                    </div>
                </div>
            </main>

            {/* UBP Viewer - Read Only */}
            <UBPViewer
                isOpen={isUBPViewerOpen}
                onClose={() => setIsUBPViewerOpen(false)}
                ubp={demo.content}
                projectName={demo.name}
                projectDescription={demo.description}
                version="0.3"
                status="locked"
                readOnly
            />
        </div>
    )
}
