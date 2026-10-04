import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSignupMetrics, type SignupMetricRow } from "@/hooks/useAdminSecurity";

const RANGE_OPTIONS_DAYS = [7, 30, 90] as const;
const DEFAULT_RANGE_DAYS = 30;

const BLOCK_REASONS: { key: keyof SignupMetricRow; label: string }[] = [
  { key: "disposable_email", label: "Disposable email" },
  { key: "honeypot", label: "Honeypot" },
  { key: "too_fast", label: "Too fast" },
  { key: "missing_fields", label: "Missing fields" },
  { key: "rate_limited", label: "Rate limited" },
];

const sumColumn = (rows: SignupMetricRow[], key: keyof SignupMetricRow) =>
  rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

const formatDayLabel = (day: string) => new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const SignupMetricsChart = () => {
  const [rangeDays, setRangeDays] = useState<number>(DEFAULT_RANGE_DAYS);
  const { data: rows = [], isLoading, error } = useSignupMetrics(rangeDays);

  const chartData = useMemo(
    () => rows.map((row) => ({ ...row, label: formatDayLabel(row.day) })),
    [rows],
  );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur" id="signup-metrics-chart">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-arcade text-sm text-primary">Signup protection</CardTitle>
          <CardDescription>Allowed vs blocked signups per day (UTC).</CardDescription>
        </div>
        <div className="flex gap-1">
          {RANGE_OPTIONS_DAYS.map((days) => (
            <Button
              key={days}
              size="sm"
              variant={days === rangeDays ? "default" : "outline"}
              onClick={() => setRangeDays(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        {error && <p className="text-sm text-destructive">Could not load signup metrics.</p>}
        {!isLoading && !error && (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="allowed" name="Allowed" stackId="signups" fill="hsl(var(--primary))" />
                  <Bar dataKey="blocked" name="Blocked" stackId="signups" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2">
              {BLOCK_REASONS.map(({ key, label }) => (
                <Badge key={key} variant="outline">
                  {label}: {sumColumn(rows, key).toLocaleString()}
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SignupMetricsChart;
