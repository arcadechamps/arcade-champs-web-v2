import { CalendarClock, Ban } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ContestNotStartedDialogProps {
  open: boolean;
  onClose: () => void;
  contestTitle: string;
  startsAt: string | null;
  endsAt?: string | null;
  gameSlug: string | null;
  variant?: "upcoming" | "closed";
}

const ContestNotStartedDialog = ({ open, onClose, contestTitle, startsAt, endsAt, gameSlug, variant = "upcoming" }: ContestNotStartedDialogProps) => {
  const isClosed = variant === "closed";

  const formattedDate = isClosed
    ? (endsAt ? format(new Date(endsAt), "MMMM d, yyyy 'at' h:mm a") : null)
    : (startsAt ? format(new Date(startsAt), "MMMM d, yyyy 'at' h:mm a") : null);

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="items-center text-center">
          {isClosed ? (
            <Ban className="mb-2 h-12 w-12 text-destructive" />
          ) : (
            <CalendarClock className="mb-2 h-12 w-12 text-primary" />
          )}
          <AlertDialogTitle className="font-arcade text-sm">
            {isClosed ? "Contest Has Ended" : "Contest Not Started"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {isClosed ? (
              <>
                The contest <span className="font-semibold text-foreground">"{contestTitle}"</span> has ended.
                {formattedDate && (
                  <> It ended on <span className="font-semibold text-foreground">{formattedDate}</span>.</>
                )}
              </>
            ) : (
              <>
                The contest <span className="font-semibold text-foreground">"{contestTitle}"</span> hasn't started yet.
                {formattedDate ? (
                  <> It will begin on <span className="font-semibold text-foreground">{formattedDate}</span>.</>
                ) : (
                  <> The start date will be announced soon.</>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          {gameSlug && (
            <AlertDialogAction asChild>
              <Link to={`/free-play/${gameSlug}`} className="gap-1.5">
                Play for Free
              </Link>
            </AlertDialogAction>
          )}
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ContestNotStartedDialog;
