import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useReminderSettings,
  useSaveReminderSettings,
  type ReminderSettings,
  type ReminderSettingsInput,
} from "@/hooks/useAdminSecurity";

interface SettingsDraft {
  remindersEnabled: boolean;
  daysBetween: string;
  maxReminders: string;
}

const toDraft = (settings: ReminderSettings): SettingsDraft => ({
  remindersEnabled: settings.reminders_enabled,
  daysBetween: String(settings.days_between),
  maxReminders: String(settings.max_reminders),
});

const buildChanges = (settings: ReminderSettings, draft: SettingsDraft): ReminderSettingsInput => {
  const changes: ReminderSettingsInput = {};
  if (draft.remindersEnabled !== settings.reminders_enabled) changes.reminders_enabled = draft.remindersEnabled;
  if (Number(draft.daysBetween) !== settings.days_between) changes.days_between = Number(draft.daysBetween);
  if (Number(draft.maxReminders) !== settings.max_reminders) changes.max_reminders = Number(draft.maxReminders);
  return changes;
};

const ReminderSettingsForm = () => {
  const { data: settings, isLoading, error } = useReminderSettings();
  const saveSettings = useSaveReminderSettings();
  const [draft, setDraft] = useState<SettingsDraft | null>(null);

  useEffect(() => {
    if (settings) setDraft(toDraft(settings));
  }, [settings]);

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  if (error || !settings || !draft) {
    return <p className="text-sm text-destructive">Could not load reminder settings.</p>;
  }

  const changes = buildChanges(settings, draft);
  const hasChanges = Object.keys(changes).length > 0;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await saveSettings.mutateAsync(changes);
      toast.success("Reminder settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur" id="reminder-settings-card">
      <CardHeader>
        <CardTitle className="font-arcade text-sm text-primary">Reminder settings</CardTitle>
        <CardDescription>Control how dormant players are reminded.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminders-enabled">Reminders enabled</Label>
            <Switch
              id="reminders-enabled"
              checked={draft.remindersEnabled}
              onCheckedChange={(checked) => setDraft({ ...draft, remindersEnabled: checked })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="days-between">Days between reminders</Label>
              <Input
                id="days-between"
                type="number"
                min={1}
                value={draft.daysBetween}
                onChange={(event) => setDraft({ ...draft, daysBetween: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-reminders">Max reminders per player</Label>
              <Input
                id="max-reminders"
                type="number"
                min={1}
                max={10}
                value={draft.maxReminders}
                onChange={(event) => setDraft({ ...draft, maxReminders: event.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Inactive after {settings.inactive_days} days</Badge>
            <Badge variant="outline">Detection {settings.detection_enabled ? "ON" : "OFF"}</Badge>
            <span>Backend controlled</span>
          </div>
          <Button type="submit" disabled={!hasChanges || saveSettings.isPending}>
            {saveSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReminderSettingsForm;
