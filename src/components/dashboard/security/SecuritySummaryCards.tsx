import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDormantSummary, type DormantSummary } from "@/hooks/useAdminSecurity";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
}

const StatCard = ({ label, value, hint }: StatCardProps) => (
  <Card className="border-border/50 bg-card/80 backdrop-blur">
    <CardHeader className="pb-1">
      <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="font-arcade text-lg text-foreground">{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const StatusBadge = ({ label, enabled }: { label: string; enabled: boolean }) => (
  <Badge
    variant="outline"
    className={cn(enabled ? "border-primary/50 text-primary" : "border-border text-muted-foreground")}
  >
    {label}: {enabled ? "ON" : "OFF"}
  </Badge>
);

const buildStatCards = (summary: DormantSummary): StatCardProps[] => [
  { label: "Total users", value: summary.total_users },
  { label: "Confirmed", value: summary.confirmed },
  { label: "Unverified", value: summary.unverified },
  { label: "Active", value: summary.active, hint: "Confirmed and recently active" },
  { label: "Inactive", value: summary.inactive, hint: "Confirmed but inactive" },
  { label: "Flagged dormant", value: summary.flagged_dormant },
  { label: "Pending re-verification", value: summary.pending_reverification },
  { label: "Re-verified", value: summary.reverified },
  { label: "Logins today", value: summary.logins_today },
  { label: "Logins (30d)", value: summary.logins_30d },
  { label: "Reminders pending", value: summary.reminders_pending },
  { label: "Reminders sent (30d)", value: summary.reminders_sent_30d },
];

const SecuritySummaryCards = () => {
  const { data: summary, isLoading, error } = useDormantSummary();

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  if (error || !summary) {
    return <p className="text-sm text-destructive">Could not load the security summary.</p>;
  }

  return (
    <div className="space-y-4" id="security-summary">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="Dormant detection" enabled={summary.detection_enabled} />
        <StatusBadge label="Reminders" enabled={summary.reminders_enabled} />
        {summary.login_tracking_since && (
          <span className="text-xs text-muted-foreground">
            Login history since {formatDateTime(summary.login_tracking_since)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {buildStatCards(summary).map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {summary.last_run
          ? `Last dormant check ${formatDateTime(summary.last_run.ran_at)}: ${summary.last_run.candidates} candidates, ${summary.last_run.newly_flagged} newly flagged, ${summary.last_run.cleared} cleared, ${summary.last_run.reminders_queued} reminders queued.`
          : "No dormant check has run yet."}
      </p>
    </div>
  );
};

export default SecuritySummaryCards;
