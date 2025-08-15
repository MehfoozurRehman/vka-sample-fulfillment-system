'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import StatusPill from '@/components/status-pill';
import type { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useQueryWithStatus } from '@/hooks/use-query';
import type { useQuery } from 'convex/react';

type CustomerRow = NonNullable<ReturnType<typeof useQuery<typeof api.screener.listCustomers>>>[number];

export default function CustomerSearch() {
  const [q, setQ] = useState('');

  const [selected, setSelected] = useState<string | null>(null);

  const [sort, setSort] = useState<'name' | 'requests'>('name');

  const { data: all, isPending: isCustomerPending } = useQueryWithStatus(api.screener.listCustomers, {});

  const results = useMemo(() => {
    if (!all) return [] as CustomerRow[];
    const list = (all as CustomerRow[]).slice();

    const term = q.trim().toLowerCase();

    const filtered = !term ? list : list.filter((r) => r.companyName.toLowerCase().includes(term));

    filtered.sort((a, b) => {
      if (sort === 'name') return a.companyName.localeCompare(b.companyName);
      if (sort === 'requests') return b.requestCount - a.requestCount || a.companyName.localeCompare(b.companyName);

      return 0;
    });

    return filtered;
  }, [all, q, sort]);

  const { data: overview, isPending } = useQueryWithStatus(api.screener.customerOverview, selected ? { stakeholderId: selected as unknown as Id<'stakeholders'> } : 'skip');

  function highlight(text: string) {
    const term = q.trim();

    if (!term) return text;

    try {
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');

      return (
        <>
          {text.split(re).map((part, i) =>
            re.test(part) ? (
              <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">
                {part}
              </mark>
            ) : (
              <React.Fragment key={i}>{part}</React.Fragment>
            ),
          )}
        </>
      );
    } catch {
      return text;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-sm">Customers</CardTitle>
              <CardDescription>All stakeholders loaded client-side. Filter instantly.</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Input placeholder="Filter companies..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" aria-label="Filter companies" />
                <div className="flex rounded-md overflow-hidden border text-[10px] font-medium">
                  <button
                    type="button"
                    onClick={() => setSort('name')}
                    className={`px-2 py-1 transition-colors ${sort === 'name' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                    aria-pressed={sort === 'name'}
                  >
                    A-Z
                  </button>
                  <button
                    type="button"
                    onClick={() => setSort('requests')}
                    className={`px-2 py-1 transition-colors border-l ${sort === 'requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                    aria-pressed={sort === 'requests'}
                  >
                    Requests
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
                {results.length} shown
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 max-h-[500px] overflow-auto rounded-lg border p-2 text-xs bg-background/40 relative">
              {isCustomerPending && (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <Loader className="animate-spin w-5 h-5" />
                </div>
              )}
              {!isCustomerPending &&
                results.map((r) => (
                  <div
                    key={r.id}
                    className={`cursor-pointer rounded-md px-3 py-2 transition-colors border flex flex-col gap-1 ${
                      selected === r.id ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/40 shadow-sm' : 'border-transparent hover:border-border/60'
                    }`}
                    onClick={() => setSelected(r.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate" title={r.companyName}>
                        {highlight(r.companyName)}
                      </span>
                      {r.vipFlag && <Badge variant="destructive">VIP</Badge>}
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                      <span>{r.requestCount} requests</span>
                    </div>
                  </div>
                ))}
              {!isCustomerPending && !results.length && (
                <div className="text-muted-foreground flex flex-col items-center justify-center h-24 gap-2">
                  <span>No matches</span>
                  {q && (
                    <button type="button" onClick={() => setQ('')} className="text-xs underline underline-offset-2 hover:text-foreground">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              {!selected ? (
                <div className="text-xs text-muted-foreground border rounded-md p-6 bg-background/40">Select a customer to view details.</div>
              ) : (
                isPending && (
                  <div className="flex items-center justify-center h-60 text-muted-foreground">
                    <Loader className="animate-spin w-6 h-6" />
                  </div>
                )
              )}
              {overview && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
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
                            <span className="font-medium tabular-nums">{overview.totalRequests}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Total Samples</span>
                            <span className="font-medium tabular-nums">{overview.totalSamples}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Rejection Rate</span>
                            <span className="font-medium tabular-nums">{(overview.rejectionRate * 100).toFixed(1)}%</span>
                            <div className="h-1.5 w-full bg-border/60 rounded overflow-hidden">
                              <div className={`h-full bg-destructive transition-all`} style={{ width: `${Math.min(100, overview.rejectionRate * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
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
                              <span className="text-muted-foreground tabular-nums">{p.count}</span>
                            </div>
                          ))}
                          {!overview.frequentProducts.length && <div className="text-muted-foreground">No data</div>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recent Requests</CardTitle>
                      <CardDescription>Most recent activity</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="max-h-56 overflow-auto text-[11px] pr-1">
                        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 font-medium sticky top-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70 py-1 border-b mb-1">
                          <span className="pl-0">ID</span>
                          <span>Status</span>
                          <span>Date</span>
                          <span className="sr-only">&nbsp;</span>
                        </div>
                        <div className="space-y-1">
                          {overview.recent.map((r) => (
                            <div key={r.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center rounded px-1 py-1 hover:bg-accent/40 transition-colors">
                              <span className="font-mono text-[10px]">{r.requestId}</span>
                              <span className="truncate text-muted-foreground flex items-center gap-1">
                                <StatusPill value={r.status} kind="status" className="capitalize" />
                              </span>
                              <span className="text-muted-foreground tabular-nums">{r.dateFmt}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                          {!overview.recent.length && <div className="text-muted-foreground">No recent activity</div>}
                        </div>
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
