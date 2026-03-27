import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Check your inbox for a password reset link.");
    }
  };

  return (
    <Layout>
      <PageMeta title="Forgot Password" description="Reset your Arcade Champs account password. Enter your email to receive a password reset link." />
      <section className="flex min-h-[80vh] items-center justify-center bg-grid px-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <img src={logo} alt="Arcade Champs" className="mx-auto mb-3 h-16 w-16 object-contain" />
            <CardTitle className="font-arcade text-sm text-primary text-glow-blue">RESET PASSWORD</CardTitle>
            <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
          </CardHeader>
          {sent ? (
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="player@arcadechamps.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full neon-border" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </section>
    </Layout>
  );
};

export default ForgotPassword;
