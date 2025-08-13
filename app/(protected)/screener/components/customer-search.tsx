'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import type { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

interface SearchResult {
  id: string;
  companyName: string;
  vipFlag: boolean;
  requestCount: number;
}
interface OverviewType {
  stakeholder: { id: string; companyName: string; vipFlag: boolean };
  firstRequest: string | null;
  totalRequests: number;
  totalSamples: number;
  rejectionRate: number;
  recent: { id: string; requestId: string; dateFmt: string; status: string }[];
  frequentProducts: { name: string; count: number }[];
}

export default function CustomerSearch() {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const all = useQuery(api.screener.listCustomers, {});
  const results = useMemo(() => {
    if (!all) return [] as SearchResult[];
    const list = all as SearchResult[];
    const term = q.trim().toLowerCase();
    if (!term) return [...list].sort((a, b) => a.companyName.localeCompare(b.companyName));
    return list.filter((r) => r.companyName.toLowerCase().includes(term)).sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [all, q]);
  const overview = useQuery(api.screener.customerOverview, selected ? { stakeholderId: selected as unknown as Id<'stakeholders'> } : 'skip') as OverviewType | undefined;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-sm">Customers</CardTitle>
              <CardDescription>All stakeholders loaded client-side. Filter instantly.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Input placeholder="Filter companies..." value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />
              <div className="text-[11px] text-muted-foreground tabular-nums">{results.length} shown</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 max-h-[460px] overflow-auto rounded border p-2 text-xs bg-background/40">
              {results.map((r) => (
                <div
                  key={r.id}
                  className={`cursor-pointer rounded px-2 py-1 transition-colors border border-transparent hover:border-border/60 ${selected === r.id ? 'bg-primary/10 ring-1 ring-primary/40' : ''}`}
                  onClick={() => setSelected(r.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate" title={r.companyName}>
                      {r.companyName}
                    </span>
                    {r.vipFlag && <Badge variant="destructive">VIP</Badge>}
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>{r.requestCount} requests</span>
                  </div>
                </div>
              ))}
              {!q && <div className="text-muted-foreground">Type to filter...</div>}
              {!results.length && <div className="text-muted-foreground">No matches.</div>}
            </div>
            <div className="md:col-span-2 space-y-4">
              {!overview && <div className="text-xs text-muted-foreground">Select a customer to view details.</div>}
              {overview && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="p-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {overview.stakeholder.companyName}
                          {overview.stakeholder.vipFlag && <Badge variant="destructive">VIP</Badge>}
                        </CardTitle>
                        <CardDescription>Aggregate request snapshot</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">First Request</span>
                            <span>{overview.firstRequest || '—'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Total Requests</span>
                            <span>{overview.totalRequests}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Total Samples</span>
                            <span>{overview.totalSamples}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Rejection Rate</span>
                            <span>{(overview.rejectionRate * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="p-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Frequently Requested</CardTitle>
                        <CardDescription>Top products</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="max-h-40 overflow-auto space-y-1 text-[11px] pr-1">
                          {overview.frequentProducts.map((p) => (
                            <div key={p.name} className="flex justify-between gap-2">
                              <span className="truncate" title={p.name}>
                                {p.name}
                              </span>
                              <span className="text-muted-foreground">{p.count}</span>
                            </div>
                          ))}
                          {!overview.frequentProducts.length && <div className="text-muted-foreground">No data</div>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="p-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recent Requests</CardTitle>
                      <CardDescription>Most recent activity</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="max-h-56 overflow-auto text-[11px] space-y-1 pr-1">
                        {overview.recent.map((r) => (
                          <div key={r.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-2">
                            <span className="font-mono">{r.requestId}</span>
                            <span className="truncate text-muted-foreground">{r.status}</span>
                            <span className="text-muted-foreground">{r.dateFmt}</span>
                          </div>
                        ))}
                        {!overview.recent.length && <div className="text-muted-foreground">No recent activity</div>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
