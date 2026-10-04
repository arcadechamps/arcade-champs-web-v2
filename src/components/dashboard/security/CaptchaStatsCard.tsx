import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CaptchaStatsCard = () => (
  <Card className="border-border/50 bg-card/80 backdrop-blur" id="captcha-stats-card">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 font-arcade text-sm text-primary">
        CAPTCHA challenges
        <Badge variant="outline">Coming soon</Badge>
      </CardTitle>
      <CardDescription>Solved / failed / total, last 7 days (from Cloudflare).</CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-3 gap-3 text-center text-muted-foreground">
      {["Solved", "Failed", "Total"].map((label) => (
        <div key={label}>
          <p className="font-arcade text-lg">—</p>
          <p className="text-xs">{label}</p>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default CaptchaStatsCard;
