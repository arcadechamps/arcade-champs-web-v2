import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Plus, Gamepad2, Trash2, Pencil, Play } from "lucide-react";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/network-error-handler";
import GameFormDialog from "./GameFormDialog";
import type { Game } from "@/types/database";
const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";

interface AdminGameManagerProps {
  games: Game[];
  onRefetch?: () => void;
}

const ADMIN_GAME_TOUR: TourStep[] = [
  { targetSelector: '[data-tour="ag-add"]', title: "Add a Game", description: "Upload ROMs, set thumbnails, and configure emulator cores. Games become available for contests and free play.", position: "bottom" },
  { targetSelector: '[data-tour="ag-table"]', title: "Game Library", description: "See all games at a glance with their core type, active status, and slug. Edit or delete games from this table.", position: "top" },
  { targetSelector: '[data-tour="ag-toggle"]', title: "Toggle Active", description: "Flip the switch to instantly enable or disable a game. Inactive games won't appear for players in contests or free play.", position: "left" },
  { targetSelector: '[data-tour="ag-preview"]', title: "Preview Games", description: "Click the play icon to open a game in free-play mode and verify it loads correctly before assigning it to a contest.", position: "left" },
];

const AdminGameManager = ({ games, onRefetch }: AdminGameManagerProps) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);

  useHotkeys('shift+n', (e) => {
    e.preventDefault();
    setCreateOpen(true);
  }, { enableOnFormTags: false }, []);

  const handleToggleActive = async (game: Game) => {
    const { error } = await supabase.from("games").update({ is_active: !game.is_active }).eq("id", game.id);
    if (handleSupabaseError(error, "Game", { onRetry: () => handleToggleActive(game) })) return;
    else onRefetch?.();
  };

  const handleDelete = async (gameId: string) => {
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (handleSupabaseError(error, "Game", { onRetry: () => handleDelete(gameId) })) return;
    toast.success("Game deleted"); onRefetch?.();
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/80 neon-border gap-2"
              onClick={() => setCreateOpen(true)}
              data-tour="ag-add"
            >
              <Plus className="h-4 w-4" /> Add Game
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Game (Shift+N)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Create dialog */}
      <GameFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        game={null}
        existingGames={games}
        onSuccess={() => onRefetch?.()}
      />

      {/* Edit dialog */}
      <GameFormDialog
        open={!!editGame}
        onOpenChange={(open) => { if (!open) setEditGame(null); }}
        game={editGame}
        existingGames={games}
        onSuccess={() => onRefetch?.()}
      />

      {/* Games table */}
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden" data-tour="ag-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Game</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Core</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} className="border-b border-border/30 last:border-0 transition-colors hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {game.thumbnail_path ? (
                      <img
                        src={`${STORAGE_BASE}/game-thumbnails/${game.thumbnail_path}`}
                        alt={game.title}
                        className="h-8 w-8 rounded object-cover border border-border/50"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary/50 border border-border/50">
                        <Gamepad2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-foreground">{game.title}</span>
                      <span className="block text-xs text-muted-foreground font-mono">{game.slug}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{game.core ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline" className={game.is_active ? "border-neon-green/30 text-neon-green" : "border-destructive/30 text-destructive"}>
                    {game.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right" data-tour="ag-toggle">
                  <Switch checked={game.is_active} onCheckedChange={() => handleToggleActive(game)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:text-primary/80"
                      onClick={() => window.open(`/free-play/${game.slug}`, '_blank')}
                      title="Preview in Free Play"
                      data-tour="ag-preview"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setEditGame(game)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border/50 bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Delete Game?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete "{game.title}".</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(game.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No games added yet. Click "Add Game" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <OnboardingTour steps={ADMIN_GAME_TOUR} storageKey="tour-admin-games" />
    </div>
  );
};

export default AdminGameManager;
