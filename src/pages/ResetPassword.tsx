import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Supabase redirects with hash params containing the recovery token.
    // The JS client automatically picks up the token and establishes a session.
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
      setChecking(false);
    });

    // Also check if there's already an active session (user may have landed here with a valid session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated! You can now sign in.");
      navigate("/login");
    }
  };

  if (checking) {
    return (
      <Layout>
        <section className="flex min-h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </section>
      </Layout>
    );
  }

  if (!validSession) {
    return (
      <Layout>
        <PageMeta title="Reset Password" description="Set a new password for your Arcade Champs account." />
        <section className="flex min-h-[80vh] items-center justify-center px-4">
          <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm text-center">
            <CardHeader>
              <img src={logo} alt="Arcade Champs" className="mx-auto mb-3 h-16 w-16 object-contain" />
              <CardTitle className="font-arcade text-sm text-primary text-glow-blue">INVALID LINK</CardTitle>
              <CardDescription>This password reset link is invalid or has expired. Please request a new one.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button variant="outline" onClick={() => navigate("/forgot-password")}>Request New Link</Button>
            </CardFooter>
          </Card>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageMeta title="Set New Password" description="Choose a new password for your Arcade Champs account." />
      <section className="flex min-h-[80vh] items-center justify-center bg-grid px-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <img src={logo} alt="Arcade Champs" className="mx-auto mb-3 h-16 w-16 object-contain" />
            <CardTitle className="font-arcade text-sm text-primary text-glow-blue">NEW PASSWORD</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full neon-border" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>
    </Layout>
  );
};

export default ResetPassword;
