import { useState, useMemo, useEffect } from "react";
import { useAdminEmails, type AdminEmail } from "@/hooks/useAdminEmails";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail,
  Send,
  Inbox,
  Search,
  Loader2,
  ArrowLeft,
  RefreshCw,
  PenSquare,
  MailOpen,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(str: string, max = 80) {
  if (!str) return "(No preview)";
  return str.length > max ? str.substring(0, max) + "…" : str;
}

// ── Compose Dialog ─────────────────────────────────────────────────
interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (to: string, subject: string, message: string) => Promise<void>;
  sending: boolean;
  defaultTo?: string;
  defaultSubject?: string;
  suggestions?: { name: string; email: string }[];
}

const ComposeDialog = ({ open, onOpenChange, onSend, sending, defaultTo, defaultSubject, suggestions = [] }: ComposeDialogProps) => {
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [message, setMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaultTo ?? "");
      setSubject(defaultSubject ?? "");
      setMessage("");
    }
  }, [open, defaultTo, defaultSubject]);

  const filteredSuggestions = useMemo(() => {
    if (!to) return suggestions.slice(0, 5);
    const q = to.toLowerCase();
    return suggestions
      .filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      .slice(0, 5);
  }, [to, suggestions]);

  const handleSubmit = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    await onSend(to.trim(), subject.trim(), message.trim());
    setTo("");
    setSubject("");
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="font-arcade text-sm flex items-center gap-2">
            <PenSquare className="h-4 w-4 text-primary" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send an email from admin@arcadechamps.com
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2 relative">
            <Label htmlFor="compose-to" className="text-xs text-muted-foreground">To</Label>
            <Input
              id="compose-to"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              type="email"
              autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-[100] w-full mt-1 bg-popover text-popover-foreground border border-border/50 shadow-md rounded-md overflow-hidden max-h-48 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <div
                    key={s.email}
                    className="px-3 py-2 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-sm flex flex-col"
                    onClick={() => {
                      setTo(s.email);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="compose-subject" className="text-xs text-muted-foreground">Subject</Label>
            <Input
              id="compose-subject"
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compose-message" className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              id="compose-message"
              placeholder="Write your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Email Detail View ──────────────────────────────────────────────
interface EmailDetailProps {
  email: AdminEmail;
  onBack: () => void;
  onReply: (toEmail: string, subject: string) => void;
}

const EmailDetail = ({ email, onBack, onReply }: EmailDetailProps) => {
  const isInbound = email.direction === "inbound";

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {isInbound && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-2 border-primary text-primary hover:bg-primary/10"
            onClick={() =>
              onReply(
                email.from_email,
                email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
              )
            }
          >
            <Send className="h-3 w-3" /> Reply
          </Button>
        )}
      </div>

      {/* Email card */}
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/30 bg-muted/30 px-5 py-4 space-y-2">
          <h3 className="font-semibold text-foreground text-base">{email.subject || "(No Subject)"}</h3>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
            <span>
              <span className="text-foreground/70">From:</span> {email.from_email}
            </span>
            <span>
              <span className="text-foreground/70">To:</span> {email.to_email}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatFullDate(email.created_at)}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] w-fit",
              isInbound
                ? "border-blue-500/30 text-blue-400"
                : "border-green-500/30 text-green-400"
            )}
          >
            {isInbound ? "Received" : "Sent"}
          </Badge>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {email.body_html ? (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed">
              {email.body_text || "(No content)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Email List Item ────────────────────────────────────────────────
interface EmailRowProps {
  email: AdminEmail;
  onClick: () => void;
}

const EmailRow = ({ email, onClick }: EmailRowProps) => {
  const isInbound = email.direction === "inbound";
  const isUnread = isInbound && !email.read;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border/20 transition-colors",
        "hover:bg-primary/5 focus-visible:outline-none focus-visible:bg-primary/5",
        isUnread && "bg-primary/[0.03]"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="mt-1.5 shrink-0">
          {isUnread ? (
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-transparent" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "text-foreground/80")}>
              {isInbound ? email.from_email : email.to_email}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] shrink-0 px-1.5 py-0",
                isInbound ? "border-blue-500/30 text-blue-400" : "border-green-500/30 text-green-400"
              )}
            >
              {isInbound ? "IN" : "OUT"}
            </Badge>
          </div>
          <p className={cn("text-sm truncate", isUnread ? "font-medium text-foreground/90" : "text-muted-foreground")}>
            {email.subject || "(No Subject)"}
          </p>
          <p className="text-xs text-muted-foreground/70 truncate">
            {truncate(email.body_text)}
          </p>
        </div>

        {/* Date */}
        <span className="shrink-0 text-xs text-muted-foreground/60 mt-0.5">
          {formatDate(email.created_at)}
        </span>
      </div>
    </button>
  );
};

// ── Main Email Manager Component ───────────────────────────────────
const AdminEmailManager = () => {
  const {
    inboxEmails,
    sentEmails,
    unreadCount,
    loading,
    refetch,
    sendEmail,
    markAsRead,
  } = useAdminEmails();

  const { profiles } = useDashboardData();
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profiles.length > 0) {
      const userIds = profiles.map((p) => p.user_id);
      supabase.rpc("get_user_emails", { user_ids: userIds }).then(({ data }) => {
        if (data) {
          const mapping: Record<string, string> = {};
          data.forEach((row: any) => {
            mapping[row.user_id] = row.email;
          });
          setUserEmails(mapping);
        }
      });
    }
  }, [profiles]);

  const suggestions = useMemo(() => {
    return profiles
      .map((p) => ({
        name: p.display_name || p.username || "Unknown User",
        email: userEmails[p.user_id],
      }))
      .filter((s) => s.email);
  }, [profiles, userEmails]);

  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{ to?: string; subject?: string }>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("inbox");

  // Filtered emails
  const filteredInbox = useMemo(() => {
    if (!search.trim()) return inboxEmails;
    const q = search.toLowerCase();
    return inboxEmails.filter(
      (e) =>
        e.from_email.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body_text.toLowerCase().includes(q)
    );
  }, [inboxEmails, search]);

  const filteredSent = useMemo(() => {
    if (!search.trim()) return sentEmails;
    const q = search.toLowerCase();
    return sentEmails.filter(
      (e) =>
        e.to_email.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body_text.toLowerCase().includes(q)
    );
  }, [sentEmails, search]);

  const handleSelectEmail = (email: AdminEmail) => {
    setSelectedEmail(email);
    if (email.direction === "inbound" && !email.read) {
      markAsRead.mutate(email.id);
    }
  };

  const handleSend = async (to: string, subject: string, message: string) => {
    try {
      await sendEmail.mutateAsync({ to, subject, message });
      toast.success(`Email sent to ${to}`);
      setComposeOpen(false);
      setComposeDefaults({});
      setActiveTab("sent");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send email");
    }
  };

  const handleReply = (toEmail: string, subject: string) => {
    setComposeDefaults({ to: toEmail, subject });
    setComposeOpen(true);
  };

  // ── Detail view ────────────────────────────────────────────────
  if (selectedEmail) {
    return (
      <div className="space-y-6">
        <EmailDetail
          email={selectedEmail}
          onBack={() => setSelectedEmail(null)}
          onReply={handleReply}
        />
        <ComposeDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          onSend={handleSend}
          sending={sendEmail.isPending}
          defaultTo={composeDefaults.to}
          defaultSubject={composeDefaults.subject}
          suggestions={suggestions}
        />
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3" data-tour="email-header">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-arcade text-sm text-foreground">Email Manager</h2>
            <p className="text-xs text-muted-foreground">
              Send and receive emails via admin@arcadechamps.com
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="gap-2 text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setComposeDefaults({});
              setComposeOpen(true);
            }}
            className="gap-2"
            data-tour="email-compose"
          >
            <PenSquare className="h-4 w-4" /> Compose
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative" data-tour="email-search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search emails by address, subject, or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch("")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="inbox" className="gap-2 text-xs">
            <Inbox className="h-3.5 w-3.5" />
            Inbox
            {unreadCount > 0 && (
              <Badge variant="default" className="h-5 min-w-[20px] px-1 text-[10px] bg-primary">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2 text-xs">
            <Send className="h-3.5 w-3.5" />
            Sent
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredInbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MailOpen className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? "No emails match your search" : "Your inbox is empty"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Incoming emails to admin@arcadechamps.com will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/50 bg-card" data-tour="email-list">
              {filteredInbox.map((email) => (
                <EmailRow key={email.id} email={email} onClick={() => handleSelectEmail(email)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredSent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Send className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? "No sent emails match your search" : "No emails sent yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Click "Compose" to send your first email
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
              {filteredSent.map((email) => (
                <EmailRow key={email.id} email={email} onClick={() => handleSelectEmail(email)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Compose dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSend={handleSend}
        sending={sendEmail.isPending}
        defaultTo={composeDefaults.to}
        defaultSubject={composeDefaults.subject}
        suggestions={suggestions}
      />
    </div>
  );
};

export default AdminEmailManager;
