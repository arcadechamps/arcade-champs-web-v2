import { useState, useEffect, useCallback } from "react";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, Mail, Users, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
}

const PAGE_SIZE = 20;

const ADMIN_NEWSLETTER_TOUR: TourStep[] = [
  { targetSelector: '[data-tour="nl-header"]', title: "Newsletter Hub", description: "See your total subscriber count at a glance. This panel manages everyone who signed up from the landing page.", position: "bottom" },
  { targetSelector: '[data-tour="nl-export"]', title: "Export to CSV", description: "Download all subscribers as a CSV file to import into Mailchimp, Brevo, or any email marketing tool.", position: "bottom" },
  { targetSelector: '[data-tour="nl-search"]', title: "Search Subscribers", description: "Find any subscriber by email. Results filter in real time with server-side pagination.", position: "bottom" },
  { targetSelector: '[data-tour="nl-table"]', title: "Manage List", description: "Select subscribers individually or in bulk. Delete unwanted entries or review signup dates.", position: "top" },
];

const AdminNewsletterSubscribers = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const query = supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact" })
      .order("subscribed_at", { ascending: false });

    if (search.trim()) {
      query.ilike("email", `%${search.trim()}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      toast.error("Failed to load subscribers");
    } else {
      setSubscribers((data as unknown as Subscriber[]) ?? []);
      setTotalCount(count ?? 0);
    }
    setSelected(new Set());
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const allOnPageSelected = subscribers.length > 0 && subscribers.every((s) => selected.has(s.id));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subscribers.map((s) => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      toast.error("No subscribers to export");
      return;
    }
    const header = "Email,Subscribed At";
    const rows = subscribers.map(
      (s) => `${s.email},${new Date(s.subscribed_at).toISOString()}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${subscribers.length} subscribers`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove subscriber");
    } else {
      toast.success("Subscriber removed");
      fetchSubscribers();
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .in("id", ids);

    if (error) {
      toast.error("Failed to remove subscribers");
    } else {
      toast.success(`Removed ${ids.length} subscriber${ids.length !== 1 ? "s" : ""}`);
      fetchSubscribers();
    }
    setBulkDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3" data-tour="nl-header">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-arcade text-sm text-foreground">Newsletter Subscribers</h2>
            <p className="text-xs text-muted-foreground">
              {totalCount} total subscriber{totalCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete {selected.size} selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selected.size} subscriber{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the selected subscribers from the newsletter list. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 border-primary text-primary hover:bg-primary/10"
            data-tour="nl-export"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative" data-tour="nl-search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : subscribers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {search ? "No subscribers match your search" : "No subscribers yet"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/50 bg-card" data-tour="nl-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((sub) => (
                <TableRow
                  key={sub.id}
                  className={`border-border/30 ${selected.has(sub.id) ? "bg-primary/5" : ""}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(sub.id)}
                      onCheckedChange={() => toggleOne(sub.id)}
                      aria-label={`Select ${sub.email}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{sub.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(sub.subscribed_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove subscriber?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove <strong>{sub.email}</strong> from the newsletter list.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(sub.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {totalCount} subscriber{totalCount !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Export hint */}
      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Export as CSV to import into Mailchimp, Brevo, or any email marketing tool.
        </p>
      )}
      <OnboardingTour steps={ADMIN_NEWSLETTER_TOUR} storageKey="tour-admin-newsletter" />
    </div>
  );
};

export default AdminNewsletterSubscribers;
