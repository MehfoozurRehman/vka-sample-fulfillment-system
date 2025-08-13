'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { IconLoader } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { PendingRow } from '../components/utils';
import React from 'react';

interface Props {
  data: PendingRow[];
  isPending: boolean;
  onSelect: (r: PendingRow) => void;
  search: string;
  setSearch: (v: string) => void;
}

export default function ScreenerTable({ data, isPending, onSelect, search, setSearch }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end px-4 lg:px-6 gap-2">
        <Input placeholder="Search id, company, app, project..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Application</TableHead>
                <TableHead className="hidden lg:table-cell">Project</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24">
                    <div className="flex w-full items-center justify-center">
                      <IconLoader className="animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length ? (
                data.map((row) => {
                  const ageH = (Date.now() - row.createdAt) / 3600000;
                  const dot = ageH > 48 ? 'bg-red-500' : ageH > 24 ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <TableRow key={row.id} className="relative z-0 cursor-pointer" onClick={() => onSelect(row)}>
                      <TableCell className="font-mono text-xs flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        {row.requestId}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        <span title={row.company}>{row.company}</span>
                        {row.vip && (
                          <Badge variant="destructive" className="ml-1">
                            VIP
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[140px] truncate" title={row.applicationType}>
                        {row.applicationType}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[160px] truncate" title={row.projectName}>
                        {row.projectName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{row.products}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{row.createdAtFmt}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
