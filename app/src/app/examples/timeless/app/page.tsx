"use client";

import { useRouter } from 'next/navigation';
import { AppShell, PageHeader, MetricCard, DataTable, Panel, FadeIn, StatusBadge, Button } from '@/components/examples/timeless/app-kit';
import { Briefcase, FolderOpen, CreditCard, Clock, LogOut } from 'lucide-react';
import { MOCK_CLIENTS } from '@/lib/examples/timeless/mock-data';

export default function AppWorkspacePage() {
  const router = useRouter();

  const TopbarContent = (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <div style={{ backgroundColor: 'var(--ink)' }} className="h-5 w-5 flex items-center justify-center">
          <span style={{ backgroundColor: 'var(--background)' }} className="block h-1.5 w-1.5 rounded-full" />
        </div>
        <span style={{ color: 'var(--ink)' }} className="font-serif text-sm font-bold tracking-widest uppercase">Timeless Portal</span>
      </div>
      <Button variant="ghost" size="sm" onClick={() => router.push("/examples/timeless")} className="text-xs uppercase tracking-widest">
        <LogOut className="mr-2 h-4 w-4" /> Return to Public
      </Button>
    </div>
  );

  return (
    <AppShell topbar={TopbarContent}>
      <div className="mx-auto max-w-7xl space-y-12 py-8">

        <FadeIn delay={0}>
          <PageHeader title="Partner Operations" subtitle="Secure project monitoring and client lifecycle management." />
        </FadeIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FadeIn delay={0.1}><MetricCard label="Active Developments" value="14" icon={<Briefcase className="h-5 w-5" />} change={{ value: "2", positive: true }} /></FadeIn>
          <FadeIn delay={0.2}><MetricCard label="Pending Consultations" value="8" icon={<Clock className="h-5 w-5" />} /></FadeIn>
          <FadeIn delay={0.3}><MetricCard label="Open Proposals" value="3" icon={<FolderOpen className="h-5 w-5" />} /></FadeIn>
          <FadeIn delay={0.4}><MetricCard label="Outstanding Ledger" value="$165,000" icon={<CreditCard className="h-5 w-5" />} /></FadeIn>
        </div>

        <FadeIn delay={0.5}>
          <Panel>
            <div style={{ borderBottomColor: 'var(--line)' }} className="p-6 border-b flex items-center justify-between">
              <h2 style={{ color: 'var(--ink)' }} className="font-serif text-xl">Client Directory</h2>
              <Button size="sm" variant="outline" className="text-xs uppercase tracking-widest">Invite Client</Button>
            </div>
            <DataTable
              data={MOCK_CLIENTS}
              columns={[
                { key: "name", header: "Primary Contact" },
                { key: "company", header: "Entity" },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status as any} /> },
                { key: "outstanding", header: "Outstanding Balance" }
              ]}
            />
          </Panel>
        </FadeIn>

      </div>
    </AppShell>
  );
}
