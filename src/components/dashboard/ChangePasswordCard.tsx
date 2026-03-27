import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { handleNetworkError } from "@/lib/network-error-handler";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "Max 72 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[a-z]/, "Include at least one lowercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const ChangePasswordCard = () => {
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setSaving(true);
    setSuccess(false);
    try {
      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Unable to verify identity");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.current_password,
      });

      if (signInError) {
        form.setError("current_password", { message: "Current password is incorrect" });
        setSaving(false);
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: values.new_password,
      });

      if (error) throw error;

      form.reset();
      setSuccess(true);
      toast.success("Password changed successfully!");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      handleNetworkError(err, "Password");
    } finally {
      setSaving(false);
    }
  };

  const PasswordToggle = ({
    show,
    onToggle,
  }: {
    show: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur" data-tour="password-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-arcade text-sm text-primary">
          <KeyRound className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your account password. You'll need your current password to make changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Password updated — you're all set!
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrent ? "text" : "password"}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        {...field}
                      />
                      <PasswordToggle show={showCurrent} onToggle={() => setShowCurrent((p) => !p)} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        {...field}
                      />
                      <PasswordToggle show={showNew} onToggle={() => setShowNew((p) => !p)} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Min 8 chars with uppercase, lowercase, and a number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        {...field}
                      />
                      <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((p) => !p)} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
