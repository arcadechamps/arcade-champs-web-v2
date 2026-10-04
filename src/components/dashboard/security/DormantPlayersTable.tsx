import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DORMANT_USERS_PAGE_SIZE,
  useDormantUsers,
  useSendReminders,
  type DormantFilter,
  type DormantUserRow,
} from "@/hooks/useAdminSecurity";
import { formatDateTime } from "@/lib/datetime";

const SEARCH_DEBOUNCE_MS = 400;

const FILTER_TABS: { value: DormantFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "dormant", label: "Dormant" },
  { value: "unverified", label: "Unverified" },
  { value: "reverify", label: "Needs code" },
];

const useDebouncedValue = (value: string, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

const PlayerBadges = ({ user }: { user: DormantUserRow }) => (
  <div className="flex flex-wrap gap-1">
    {!user.email_confirmed && <Badge variant="outline">Unverified</Badge>}
    {user.is_dormant && <Badge variant="destructive">Dormant</Badge>}
    {user.reverify_required && <Badge variant="secondary">Needs code</Badge>}
    {user.reminder_pending && <Badge variant="outline">Queued</Badge>}
    {user.is_admin && <Badge variant="outline">Admin</Badge>}
  </div>
);

const DormantPlayersTable = () => {
  const [filter, setFilter] = useState<DormantFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const { data, isLoading, error } = useDormantUsers(filter, search, page);
  const sendReminders = useSendReminders();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / DORMANT_USERS_PAGE_SIZE) - 1);
  const allPageSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.user_id));

  useEffect(() => {
    setPage(0);
    setSelectedIds([]);
  }, [filter, search]);

  const toggleRow = (userId: string, checked: boolean) =>
    setSelectedIds((current) => (checked ? [...current, userId] : current.filter((id) => id !== userId)));

  const togglePage = (checked: boolean) =>
    setSelectedIds(checked ? Array.from(new Set([...selectedIds, ...rows.map((row) => row.user_id)])) : []);

  const handleConfirmSend = async () => {
    setConfirmOpen(false);
    try {
      const result = await sendReminders.mutateAsync(selectedIds);
      toast.success(`${result.queued} reminders queued, ${result.skipped} skipped`);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not queue reminders.");
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur" id="dormant-players-table">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-arcade text-sm text-primary">Players</CardTitle>
            <CardDescription>{total.toLocaleString()} players. Reminders work best from the Dormant tab.</CardDescription>
          </div>
          <Button
            id="send-reminders-button"
            size="sm"
            disabled={selectedIds.length === 0 || sendReminders.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {sendReminders.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send reminder ({selectedIds.length})
          </Button>
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as DormantFilter)}>
          <TabsList className="flex-wrap h-auto">
            {FILTER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          id="players-search"
          placeholder="Search email, username or display name"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        {error && <p className="text-sm text-destructive">Could not load players.</p>}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox checked={allPageSelected} onCheckedChange={(checked) => togglePage(checked === true)} aria-label="Select all on page" />
                  </TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Logins 30d / 90d</TableHead>
                  <TableHead>Reminders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No players found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(user.user_id)}
                        onCheckedChange={(checked) => toggleRow(user.user_id, checked === true)}
                        aria-label={`Select ${user.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{user.display_name ?? user.username ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(user.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap" title={user.dormant_since ? `Dormant since ${formatDateTime(user.dormant_since)}` : undefined}>
                      {user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "Never"}
                      {user.days_inactive != null && (
                        <div className="text-xs text-muted-foreground">{user.days_inactive} days</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <PlayerBadges user={user} />
                    </TableCell>
                    <TableCell>
                      {user.logins_30d} / {user.logins_90d}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.reminder_count}
                      {user.last_reminder_at && (
                        <div className="text-xs text-muted-foreground">{formatDateTime(user.last_reminder_at)}</div>
                      )}
                    </TableCell>
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send reminder to {selectedIds.length} players?</AlertDialogTitle>
            <AlertDialogDescription>
              Reminders are queued and sent within about 10 minutes. Admins, unconfirmed users, already queued
              players and anyone over the reminder limit are skipped automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DormantPlayersTable;
