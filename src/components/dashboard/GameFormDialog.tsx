import { useState, useRef, useEffect } from "react";
import { Upload, Image, X, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleNetworkError } from "@/lib/network-error-handler";
import { GAMES } from "@/data/games-config";
import { getKeyMapping, type DbKeymapping } from "@/data/keymappings";
import type { Game } from "@/types/database";

const STORAGE_BASE = "https://vppcnlzbpovswfjbdmpm.supabase.co/storage/v1/object/public";
const CORES = ["mame2003_plus", "fceumm", "snes9x", "gambatte", "segaMD", "custom"];

interface GameFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: Game | null;
  existingGames: Game[];
  onSuccess: () => void;
}

const GameFormDialog = ({ open, onOpenChange, game, existingGames, onSuccess }: GameFormDialogProps) => {
  const isEdit = !!game;
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [core, setCore] = useState("mame2003_plus");
  const [isActive, setIsActive] = useState(true);
  const [romFile, setRomFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [useConfig, setUseConfig] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [keymapOpen, setKeymapOpen] = useState(false);
  const [keymapFields, setKeymapFields] = useState<Record<string, { key: string; action: string }>>({});
  const [keymapExtras, setKeymapExtras] = useState<{ key: string; action: string }[]>([]);

  const romRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (open && game) {
      setTitle(game.title);
      setSlug(game.slug);
      setDescription(game.description ?? "");
      setCore(game.core);
      setIsActive(game.is_active);
      setRomFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(
        game.thumbnail_path ? `${STORAGE_BASE}/game-thumbnails/${game.thumbnail_path}` : null
      );
      setUseConfig(false);
      setSelectedConfigId("");
      // Populate keymapping from DB, merging with defaults for empty values
      const dbKm = (game as any).keymapping as DbKeymapping | null;
      const defaults = getKeyMapping(game.slug, game.core);
      if (dbKm) {
        const fields: Record<string, { key: string; action: string }> = {};
        for (const btn of ["up", "down", "left", "right", "a", "b", "start", "select"] as const) {
          const dbEntry = dbKm[btn];
          fields[btn] = {
            key: dbEntry?.key || defaults[btn],
            action: dbEntry?.action || defaults[`${btn}Action`] || "",
          };
        }
        setKeymapFields(fields);
        setKeymapExtras(dbKm.extras ?? []);
        setKeymapOpen(true);
      } else {
        setKeymapFields({});
        setKeymapExtras([]);
        setKeymapOpen(false);
      }
    } else if (open && !game) {
      // Reset for create
      setTitle("");
      setSlug("");
      setDescription("");
      setCore("mame2003_plus");
      setIsActive(true);
      setRomFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setUseConfig(false);
      setSelectedConfigId("");
      setKeymapFields({});
      setKeymapExtras([]);
      setKeymapOpen(false);
    }
  }, [open, game]);

  // Handle thumbnail file selection preview
  const handleThumbnailChange = (file: File | null) => {
    setThumbnailFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const configGame = GAMES.find((g) => g.id === selectedConfigId);

  const availableConfigs = GAMES.filter(
    (cfg) => !existingGames.some((g) => g.slug === cfg.id)
  );

  const uploadFile = async (bucket: string, file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const filePath = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalTitle = title;
      let finalSlug = slug;
      let finalCore = core;
      let finalDescription: string | null = description || null;
      let romPath: string | null = game?.rom_path ?? null;
      let thumbnailPath: string | null = game?.thumbnail_path ?? null;

      // Build keymapping JSONB (null if empty)
      const hasKeymapData = Object.keys(keymapFields).length > 0 || keymapExtras.length > 0;
      const keymappingPayload: DbKeymapping | null = hasKeymapData
        ? {
            ...Object.fromEntries(
              Object.entries(keymapFields).filter(([, v]) => v.key || v.action)
            ),
            ...(keymapExtras.length > 0 ? { extras: keymapExtras.filter((e) => e.key || e.action) } : {}),
          }
        : null;

      // If using config library (create only)
      if (!isEdit && useConfig && configGame) {
        finalTitle = configGame.title;
        finalSlug = configGame.id;
        finalCore = configGame.core;
        finalDescription = configGame.description;
        romPath = configGame.rom;
      }

      // Upload ROM if new file selected
      if (romFile) {
        romPath = await uploadFile("game-roms", romFile, finalSlug || "game");
      }

      // Upload thumbnail if new file selected
      if (thumbnailFile) {
        thumbnailPath = await uploadFile("game-thumbnails", thumbnailFile, finalSlug || "game");
      }

      if (isEdit && game) {
        const { error } = await supabase
          .from("games")
          .update({
            title: finalTitle,
            slug: finalSlug,
            core: finalCore,
            description: finalDescription,
            rom_path: romPath,
            thumbnail_path: thumbnailPath,
            is_active: isActive,
            keymapping: keymappingPayload,
          } as any)
          .eq("id", game.id);
        if (error) throw error;
        toast.success("Game updated!");
      } else {
        const { error } = await supabase.from("games").insert({
          title: finalTitle,
          slug: finalSlug,
          core: finalCore,
          description: finalDescription,
          rom_path: romPath,
          thumbnail_path: thumbnailPath,
          is_active: isActive,
          keymapping: keymappingPayload,
        } as any);
        if (error) throw error;
        toast.success("Game added!");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      handleNetworkError(err, "Game");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-card max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-arcade text-xs text-foreground">
            {isEdit ? "Edit Game" : "Add Game"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? "Update game details, ROM file, or thumbnail."
              : "Add a game from the library or create a custom one."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Library toggle — only on create */}
          {!isEdit && (
            <div className="flex items-center gap-3">
              <Switch checked={useConfig} onCheckedChange={setUseConfig} />
              <Label className="text-muted-foreground text-sm">Use game from library</Label>
            </div>
          )}

          {!isEdit && useConfig ? (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Select Game</Label>
              <Select value={selectedConfigId} onValueChange={setSelectedConfigId} required>
                <SelectTrigger className="border-border bg-secondary/50 text-foreground">
                  <SelectValue placeholder="Choose a game..." />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {availableConfigs.map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.id}>
                      {cfg.title} ({cfg.core})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {configGame && (
                <p className="text-xs text-muted-foreground">
                  ROM: {configGame.rom} • Core: {configGame.core}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required={!useConfig}
                  placeholder="Game Title"
                  className="border-border bg-secondary/50 text-foreground"
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required={!useConfig}
                  placeholder="game-slug"
                  className="border-border bg-secondary/50 text-foreground"
                  disabled={isEdit}
                />
                {isEdit && (
                  <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Game description..."
                  className="border-border bg-secondary/50 text-foreground"
                />
              </div>

              {/* Core */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Core / Emulator</Label>
                <Select value={core} onValueChange={setCore}>
                  <SelectTrigger className="border-border bg-secondary/50 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {CORES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="text-muted-foreground text-sm">Active</Label>
              </div>

              {/* ROM File */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">ROM File</Label>
                {isEdit && game?.rom_path && !romFile && (
                  <p className="text-xs text-muted-foreground">
                    Current: <span className="font-mono text-foreground">{game.rom_path}</span>
                  </p>
                )}
                <div
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 transition-colors"
                  onClick={() => romRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {romFile ? romFile.name : isEdit ? "Upload new ROM (optional)..." : "Click to select ROM file..."}
                </div>
                <input
                  ref={romRef}
                  type="file"
                  className="hidden"
                  accept=".zip,.nes,.smc,.sfc,.gb,.gbc,.gba,.bin,.htm,.html"
                  onChange={(e) => setRomFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Thumbnail / Cover Image */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Thumbnail / Cover Image</Label>
                {thumbnailPreview && (
                  <div className="relative w-32 h-20 rounded-md overflow-hidden border border-border">
                    <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-destructive/80 transition-colors"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground hover:border-accent/50 transition-colors"
                  onClick={() => thumbRef.current?.click()}
                >
                  <Image className="h-4 w-4" />
                  {thumbnailFile ? thumbnailFile.name : "Click to upload cover image..."}
                </div>
                <input
                  ref={thumbRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleThumbnailChange(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          )}

          {/* Controls Mapping (collapsible) */}
          <div className="rounded-lg border border-border/50 bg-secondary/20">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (!keymapOpen && Object.keys(keymapFields).length === 0) {
                  // Pre-populate with defaults from core
                  const coreToUse = isEdit ? game?.core ?? core : useConfig && configGame ? configGame.core : core;
                  const slugToUse = isEdit ? game?.slug ?? slug : useConfig && configGame ? configGame.id : slug;
                  const defaults = getKeyMapping(slugToUse, coreToUse);
                  const fields: Record<string, { key: string; action: string }> = {};
                  for (const btn of ["up", "down", "left", "right", "a", "b", "start", "select"] as const) {
                    fields[btn] = { key: defaults[btn], action: defaults[`${btn}Action`] || "" };
                  }
                  setKeymapFields(fields);
                  setKeymapExtras(
                    defaults.extras?.map((e) => ({ key: e.key, action: e.action || e.label })) ?? []
                  );
                }
                setKeymapOpen(!keymapOpen);
              }}
            >
              {keymapOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Controls Mapping (Optional)
            </button>

            {keymapOpen && (
              <div className="space-y-3 border-t border-border/30 px-3 pb-3 pt-2">
                <p className="text-[10px] text-muted-foreground">
                  Customize what action each button performs. Leave empty to use defaults.
                </p>

                {/* D-Pad */}
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">D-Pad</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["up", "down", "left", "right"] as const).map((btn) => (
                      <div key={btn} className="flex gap-1">
                        <Input
                          value={keymapFields[btn]?.key ?? ""}
                          onChange={(e) =>
                            setKeymapFields((prev) => ({
                              ...prev,
                              [btn]: { ...prev[btn], key: e.target.value, action: prev[btn]?.action ?? "" },
                            }))
                          }
                          placeholder="Key"
                          className="h-7 w-16 border-border bg-secondary/50 text-xs text-foreground"
                        />
                        <Input
                          value={keymapFields[btn]?.action ?? ""}
                          onChange={(e) =>
                            setKeymapFields((prev) => ({
                              ...prev,
                              [btn]: { ...prev[btn], key: prev[btn]?.key ?? "", action: e.target.value },
                            }))
                          }
                          placeholder={`${btn} action`}
                          className="h-7 flex-1 border-border bg-secondary/50 text-xs text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Action Buttons</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["a", "b"] as const).map((btn) => (
                      <div key={btn} className="flex gap-1">
                        <Input
                          value={keymapFields[btn]?.key ?? ""}
                          onChange={(e) =>
                            setKeymapFields((prev) => ({
                              ...prev,
                              [btn]: { ...prev[btn], key: e.target.value, action: prev[btn]?.action ?? "" },
                            }))
                          }
                          placeholder="Key"
                          className="h-7 w-16 border-border bg-secondary/50 text-xs text-foreground"
                        />
                        <Input
                          value={keymapFields[btn]?.action ?? ""}
                          onChange={(e) =>
                            setKeymapFields((prev) => ({
                              ...prev,
                              [btn]: { ...prev[btn], key: prev[btn]?.key ?? "", action: e.target.value },
                            }))
                          }
                          placeholder={`${btn.toUpperCase()} action`}
                          className="h-7 flex-1 border-border bg-secondary/50 text-xs text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Buttons */}
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">System</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["start", "select"] as const).map((btn) => (
                      <div key={btn} className="flex gap-1">
                        <Input
                          value={keymapFields[btn]?.key ?? ""}
                          onChange={(e) =>
                            setKeymapFields((prev) => ({
                              ...prev,
                              [btn]: { ...prev[btn], key: e.target.value, action: prev[btn]?.action ?? "" },
                            }))
                          }
                          placeholder="Key"
                          className="h-7 w-16 border-border bg-secondary/50 text-xs text-foreground"
                        />
                        <Input
                          value={keymapFields[btn]?.action ?? ""}
                          onChange={(e) =>
                            setKeymapFields((prev) => ({
                              ...prev,
                              [btn]: { ...prev[btn], key: prev[btn]?.key ?? "", action: e.target.value },
                            }))
                          }
                          placeholder={`${btn} action`}
                          className="h-7 flex-1 border-border bg-secondary/50 text-xs text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extra Buttons */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Extra Buttons</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => setKeymapExtras((prev) => [...prev, { key: "", action: "" }])}
                    >
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                  {keymapExtras.map((extra, i) => (
                    <div key={i} className="mb-1 flex gap-1">
                      <Input
                        value={extra.key}
                        onChange={(e) => {
                          const updated = [...keymapExtras];
                          updated[i] = { ...updated[i], key: e.target.value };
                          setKeymapExtras(updated);
                        }}
                        placeholder="Key"
                        className="h-7 w-16 border-border bg-secondary/50 text-xs text-foreground"
                      />
                      <Input
                        value={extra.action}
                        onChange={(e) => {
                          const updated = [...keymapExtras];
                          updated[i] = { ...updated[i], action: e.target.value };
                          setKeymapExtras(updated);
                        }}
                        placeholder="Action"
                        className="h-7 flex-1 border-border bg-secondary/50 text-xs text-foreground"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setKeymapExtras((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Clear button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setKeymapFields({});
                    setKeymapExtras([]);
                  }}
                >
                  Clear All (Use Defaults)
                </Button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting || (!isEdit && useConfig && !selectedConfigId)}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/80 neon-border-pink"
          >
            {submitting ? (isEdit ? "Saving..." : "Adding...") : isEdit ? "Save Changes" : "Add Game"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GameFormDialog;
