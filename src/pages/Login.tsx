import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY as string;


const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  const resolveErrorMessage = (message: string): string => {
    if (message.toLowerCase().includes("captcha")) return "Verification failed, please try again.";
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password, captchaToken ?? undefined);
    // Always reset the widget after a submit attempt — tokens are single-use
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setLoading(false);
    if (error) {
      toast.error(resolveErrorMessage(error.message));
    } else {
      toast.success("Logged in!");
      navigate("/dashboard");
    }
  };


  return (
    <Layout>
      <PageMeta title="Login" description="Sign in to your Arcade Champs account to play games and compete in contests." />
      <section className="flex min-h-[80vh] items-center justify-center bg-grid px-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <img src={logo} alt="Arcade Champs" className="mx-auto mb-3 h-16 w-16 object-contain" />
            <CardTitle className="font-arcade text-sm text-primary text-glow-blue">LOGIN</CardTitle>
            <CardDescription>Sign in to your Arcade Champs account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="player@arcadechamps.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITEKEY}
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
                options={{ size: "flexible" }}
              />
              <Button type="submit" className="w-full neon-border" disabled={loading || !captchaToken}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">Sign Up</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </section>
    </Layout>
  );
};

export default Login;
