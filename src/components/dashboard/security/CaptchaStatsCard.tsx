import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  useCaptchaStats,
  type CaptchaDailyStat,
  type CaptchaStatsRange,
  type CaptchaStatsTotals,
} from "@/hooks/useCaptchaStats";

const CAPTCHA_STATS_DAYS: CaptchaStatsRange = 7;

const chartConfig = {
  solved: { label: "Solved", color: "hsl(var(--primary))" },
  unsolved: { label: "Unsolved", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

interface TotalTile {
  label: string;
  value: string;
}

const buildTotalTiles = (totals: CaptchaStatsTotals): TotalTile[] => [
  { label: "Issued", value: totals.issued.toLocaleString() },
  { label: "Solved", value: totals.solved.toLocaleString() },
  { label: "Unsolved", value: totals.unsolved.toLocaleString() },
  { label: "Solve rate", value: `${totals.solve_rate}%` },
  { label: "Auto solved", value: totals.solved_automatically.toLocaleString() },
  { label: "Solved with click", value: totals.solved_with_click.toLocaleString() },
];

const formatDayLabel = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const DailyChart = ({ daily }: { daily: CaptchaDailyStat[] }) => (
  <ChartContainer config={chartConfig} className="h-40 w-full">
    <BarChart data={daily} accessibilityLayer>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="date"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={16}
        tickFormatter={formatDayLabel}
      />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={formatDayLabel} />} />
      <Bar dataKey="solved" stackId="challenges" fill="var(--color-solved)" />
      <Bar dataKey="unsolved" stackId="challenges" fill="var(--color-unsolved)" radius={[3, 3, 0, 0]} />
    </BarChart>
  </ChartContainer>
);

const CaptchaStatsBody = ({ days }: { days: CaptchaStatsRange }) => {
  const { data: stats, isLoading, error } = useCaptchaStats(days);

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  if (error || !stats) {
    return <p className="text-sm text-destructive">Couldn't load stats</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
        {buildTotalTiles(stats.totals).map((tile) => (
          <div key={tile.label}>
            <p className="font-arcade text-lg text-foreground">{tile.value}</p>
            <p className="text-xs text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </div>
      <DailyChart daily={stats.daily} />
    </div>
  );
};

const CaptchaStatsCard = () => (
  <Card className="border-border/50 bg-card/80 backdrop-blur" id="captcha-stats-card">
    <CardHeader>
      <CardTitle className="font-arcade text-sm text-primary">CAPTCHA challenges</CardTitle>
      <CardDescription>Last {CAPTCHA_STATS_DAYS} days (from Cloudflare).</CardDescription>
    </CardHeader>
    <CardContent>
      <CaptchaStatsBody days={CAPTCHA_STATS_DAYS} />
    </CardContent>
  </Card>
);

export default CaptchaStatsCard;
