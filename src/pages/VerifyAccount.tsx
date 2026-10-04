import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReverifyStatus } from "@/hooks/useReverifyStatus";
import logo from "@/assets/logo.png";

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY as string;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_DESTINATION = "/dashboard";

interface AuthErrorLike {
  message?: string;
  code?: string;
}

interface RedirectState {
  from?: { pathname: string; search?: string };
}

export const resolveSendCodeError = ({ message = "", code = "" }: AuthErrorLike): string => {
  if (code === "captcha_failed" || message.toLowerCase().includes("captcha")) {
    return "Verification failed, please try again.";
  }
  if (code === "over_email_send_rate_limit" || message.toLowerCase().includes("rate limit")) {
    return "Too many requests, please wait a minute and try again.";
  }
  return message || "Could not send the code. Please try again.";
};

export const resolveVerifyCodeError = ({ message = "", code = "" }: AuthErrorLike): string => {
  const lowered = message.toLowerCase();
  if (code === "otp_expired" || lowered.includes("expired") || lowered.includes("invalid")) {
    return "That code is wrong or has expired. Request a new one and try again.";
  }
  return message || "Could not verify the code. Please try again.";
};

const VerifyAccount = () => {
  const { user, loading, signOut } = useAuth();
  const { isLoading: statusLoading, reverifyRequired, recheck } = useReverifyStatus(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const turnstileRef = useRef<any>(null);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const redirectState = location.state as RedirectState | null;
  const destination = redirectState?.from
    ? `${redirectState.from.pathname}${redirectState.from.search ?? ""}`
    : DEFAULT_DESTINATION;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const handleSendCode = async () => {
    if (!user?.email || !captchaToken) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { captchaToken, shouldCreateUser: false },
    });
    resetCaptcha();
    setSending(false);
    if (error) {
      toast.error(resolveSendCodeError(error));
      return;
    }
    setCodeSent(true);
    setCode("");
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    toast.success("Code sent. Check your email.");
  };

  const handleVerifyCode = async () => {
    if (!user?.email || code.length !== OTP_LENGTH) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email: user.email, token: code, type: "email" });
    if (error) {
      setVerifying(false);
      setCode("");
      toast.error(resolveVerifyCodeError(error));
      return;
    }
    try {
      const stillFlagged = await recheck();
      if (!stillFlagged) navigate(destination, { replace: true });
      else toast.error("We couldn't confirm your account. Please request a new code.");
    } catch {
      toast.error("Could not confirm your status. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading || (user && statusLoading)) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!reverifyRequired && !verifying) return <Navigate to={destination} replace />;

  const canSend = Boolean(captchaToken) && !sending && cooldownSeconds === 0;

  return (
    <Layout>
      <PageMeta title="Verify Account" description="Confirm your Arcade Champs account with a one-time email code." />
      <section className="flex min-h-[80vh] items-center justify-center bg-grid px-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <img src={logo} alt="Arcade Champs" className="mx-auto mb-3 h-16 w-16 object-contain" />
            <h1 className="font-arcade text-sm text-primary text-glow-blue">VERIFY YOUR ACCOUNT</h1>
            <CardTitle className="sr-only">Verify your account</CardTitle>
            <CardDescription>
              For your security, we've sent a 6-digit code to{" "}
              <span className="text-foreground">{user.email}</span>. Enter it below to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {codeSent && (
              <div className="flex flex-col items-center gap-4">
                <InputOTP maxLength={OTP_LENGTH} value={code} onChange={setCode} disabled={verifying} id="verify-otp">
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }, (_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  id="verify-code-button"
                  className="w-full neon-border"
                  onClick={handleVerifyCode}
                  disabled={verifying || code.length !== OTP_LENGTH}
                >
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            )}
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
            <Button
              id="send-code-button"
              variant={codeSent ? "outline" : "default"}
              className="w-full"
              onClick={handleSendCode}
              disabled={!canSend}
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
              {!codeSent && "Send code"}
              {codeSent && (cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : "Resend code")}
            </Button>
            <button
              type="button"
              id="verify-logout-link"
              onClick={() => signOut()}
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Log out
            </button>
          </CardFooter>
        </Card>
      </section>
    </Layout>
  );
};

export default VerifyAccount;
