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


const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
  disposable_email: "Please use a permanent email address.",
  rate_limited: "Too many signup attempts. Please try again later.",
  signup_blocked: "Something went wrong, please try again.",
};

const Signup = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [honeypotValue, setHoneypotValue] = useState("");
  const turnstileRef = useRef<any>(null);
  // Set once on mount — measures how long the user took to fill the form
  const formStartedAt = useRef(Date.now());

  const resolveErrorMessage = (message: string): string => {
    if (message.toLowerCase().includes("captcha")) return "Verification failed, please try again.";
    return SIGNUP_ERROR_MESSAGES[message] ?? message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const formFillMs = Math.round(Date.now() - formStartedAt.current);
    const { error } = await signUp(
      email,
      password,
      displayName,
      captchaToken ?? undefined,
      honeypotValue,
      formFillMs
    );
    // Always reset the widget after a submit — tokens are single-use
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setLoading(false);
    if (error) {
      toast.error(resolveErrorMessage(error.message));
    } else {
      toast.success("Account created! Check your email to confirm, or sign in now.");
      navigate("/login");
    }
  };


  return (
    <Layout>
      <PageMeta title="Create Account" description="Join Arcade Champs to compete in skill-based retro gaming contests and win prizes." />
      <section className="flex min-h-[80vh] items-center justify-center bg-grid px-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <img src={logo} alt="Arcade Champs" className="mx-auto mb-3 h-16 w-16 object-contain" />
            <CardTitle className="font-arcade text-sm text-primary text-glow-blue">SIGN UP</CardTitle>
            <CardDescription>Create your Arcade Champs account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" placeholder="Player One" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="player@arcadechamps.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              {/* Honeypot field — visually hidden but accessible to bots */}
              <div
                style={{
                  position: "absolute",
                  left: "-10000px",
                  top: "auto",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                }}
                aria-hidden="true"
              >
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypotValue}
                  onChange={(e) => setHoneypotValue(e.target.value)}
                />
              </div>
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
                Create Account
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">Login</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </section>
    </Layout>
  );
};

export default Signup;
