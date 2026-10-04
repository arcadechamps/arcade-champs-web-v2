import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SECURITY_LOGS_PAGE_SIZE, useSecurityLogs } from "@/hooks/useAdminSecurity";
import { formatDateTime } from "@/lib/datetime";

const SecurityLogsTable = () => {
  const [page, setPage] = useState(0);
  const [blockedOnly, setBlockedOnly] = useState(false);
  const { data, isLoading, error } = useSecurityLogs(page, blockedOnly);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / SECURITY_LOGS_PAGE_SIZE) - 1);

  const handleBlockedOnlyChange = (checked: boolean) => {
    setBlockedOnly(checked);
    setPage(0);
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur" id="security-logs-table">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-arcade text-sm text-primary">Security log</CardTitle>
          <CardDescription>{total.toLocaleString()} events</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="logs-blocked-only"
            checked={blockedOnly}
            onCheckedChange={(checked) => handleBlockedOnlyChange(checked === true)}
          />
          <Label htmlFor="logs-blocked-only">Blocked only</Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        {error && <p className="text-sm text-destructive">Could not load the security log.</p>}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Email domain</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Fill (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No events found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{row.event}</TableCell>
                    <TableCell>
                      {row.blocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="outline">Allowed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.reason ?? "—"}</TableCell>
                    <TableCell>{row.provider ?? "—"}</TableCell>
                    <TableCell>{row.email_domain ?? "—"}</TableCell>
                    <TableCell>{row.ip_address ?? "—"}</TableCell>
                    <TableCell className="text-right">{row.fill_ms ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {lastPage + 1}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityLogsTable;
