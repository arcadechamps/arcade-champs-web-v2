import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Loader2, UserCog, Wallet } from "lucide-react";
import ChangePasswordCard from "./ChangePasswordCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { handleNetworkError } from "@/lib/network-error-handler";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OnboardingTour, { type TourStep } from "@/components/OnboardingTour";

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="profile-card"]', title: "Your Public Profile", description: "Set your display name and username — this is how other players see you on leaderboards and contests!", position: "bottom" },
  { targetSelector: '[data-tour="payout-card"]', title: "Payout Method", description: "Add your PayPal, Venmo, or CashApp so admins can send your winnings when you cash out!", position: "top" },
  { targetSelector: '[data-tour="password-card"]', title: "Secure Your Account", description: "Keep your account safe by setting a strong password. You can change it anytime right here!", position: "top" },
];

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Display name is required").max(50, "Max 50 characters"),
  username: z
    .string()
    .trim()
    .min(3, "Min 3 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores")
    .nullable()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const payoutSchema = z.object({
  payout_method: z.string().refine(v => v === "" || ["paypal", "venmo", "cashapp"].includes(v), "Invalid method"),
  payout_handle: z.string().trim().max(100, "Max 100 characters"),
}).refine(
  (d) => {
    if (d.payout_method && d.payout_method !== "") return d.payout_handle.length > 0;
    return true;
  },
  { message: "Handle is required when a method is selected", path: ["payout_handle"] }
);

type PayoutFormValues = z.infer<typeof payoutSchema>;

const PAYOUT_LABELS: Record<string, string> = {
  paypal: "PayPal Email",
  venmo: "Venmo Username",
  cashapp: "CashApp $Cashtag",
};

const PAYOUT_PLACEHOLDERS: Record<string, string> = {
  paypal: "you@example.com",
  venmo: "@username",
  cashapp: "$cashtag",
};

const ProfileSettings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name ?? "",
      username: profile?.username ?? "",
    },
  });

  const payoutForm = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      payout_method: (profile as any)?.payout_method ?? "",
      payout_handle: (profile as any)?.payout_handle ?? "",
    },
  });

  const selectedMethod = payoutForm.watch("payout_method");

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path) + `?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await refreshProfile();
      toast.success("Avatar updated!");
    } catch (err: any) {
      handleNetworkError(err, "Profile");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      const newUsername = values.username || null;
      if (newUsername && newUsername !== profile?.username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", newUsername)
          .neq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          form.setError("username", { message: "Username already taken" });
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: values.display_name,
          username: newUsername,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile saved!");
    } catch (err: any) {
      handleNetworkError(err, "Profile");
    } finally {
      setSaving(false);
    }
  };

  const onPayoutSubmit = async (values: PayoutFormValues) => {
    if (!user) return;
    setSavingPayout(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          payout_method: values.payout_method || null,
          payout_handle: values.payout_handle || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Payout method saved!");
    } catch (err: any) {
      handleNetworkError(err, "Profile");
    } finally {
      setSavingPayout(false);
    }
  };

  const initials = (profile?.display_name ?? profile?.username ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur" data-tour="profile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-arcade text-sm text-primary">
            <UserCog className="h-5 w-5" />
            My Profile
          </CardTitle>
          <CardDescription>Update your public profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/30">
                <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" />
                <AvatarFallback className="bg-primary/10 text-primary font-arcade text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Click the camera icon to upload a new avatar.
              <br />
              Max 2 MB, JPG/PNG recommended.
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
                    </FormControl>
                    <FormDescription>This is shown publicly on leaderboards.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="unique_username" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Letters, numbers, and underscores only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Payout Method Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur" data-tour="payout-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-arcade text-sm text-accent">
            <Wallet className="h-5 w-5" />
            Payout Method
          </CardTitle>
          <CardDescription>
            Save your preferred payout method so admins can send your withdrawal payouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...payoutForm}>
            <form onSubmit={payoutForm.handleSubmit(onPayoutSubmit)} className="space-y-4">
              <FormField
                control={payoutForm.control}
                name="payout_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Platform</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="border-border bg-secondary/50 text-foreground">
                          <SelectValue placeholder="Select a payout method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-border bg-card">
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="venmo">Venmo</SelectItem>
                        <SelectItem value="cashapp">CashApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedMethod && selectedMethod !== "" && (
                <FormField
                  control={payoutForm.control}
                  name="payout_handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{PAYOUT_LABELS[selectedMethod] ?? "Handle"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={PAYOUT_PLACEHOLDERS[selectedMethod] ?? ""}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be visible to admins when processing your withdrawals.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" disabled={savingPayout} className="w-full sm:w-auto">
                {savingPayout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Payout Method
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <ChangePasswordCard />

      <OnboardingTour steps={TOUR_STEPS} storageKey="tour-player-profile" />
    </div>
  );
};

export default ProfileSettings;
