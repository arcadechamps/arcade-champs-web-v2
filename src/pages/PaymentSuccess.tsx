import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";

type VerifyState = "loading" | "success" | "already_credited" | "error";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [state, setState] = useState<VerifyState>("loading");
  const [amount, setAmount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setState("error");
      setErrorMsg("Missing payment session.");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-wallet-topup", {
          body: { session_id: sessionId },
        });

        if (error) {
          setState("error");
          setErrorMsg(error.message || "Verification failed");
          return;
        }

        if (data?.success) {
          setAmount(data.amount_cents);
          setState(data.already_credited ? "already_credited" : "success");
          if (user) {
            queryClient.invalidateQueries({ queryKey: ["wallet-balance", user.id] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }
        } else {
          setState("error");
          setErrorMsg(data?.error || "Verification failed");
        }
      } catch (e: any) {
        setState("error");
        setErrorMsg(e.message || "Unexpected error");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <Layout>
      <PageMeta title="Payment Successful" />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md rounded-lg border border-border/50 bg-card p-8 text-center">
          {state === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h2 className="mt-4 font-arcade text-sm text-foreground">Verifying Payment...</h2>
              <p className="mt-2 text-sm text-muted-foreground">Please wait while we confirm your payment.</p>
            </>
          )}

          {(state === "success" || state === "already_credited") && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-neon-green" />
              <h2 className="mt-4 font-arcade text-sm text-foreground">
                {state === "already_credited" ? "Already Credited" : "Payment Successful!"}
              </h2>
              <p className="mt-2 text-2xl font-bold text-neon-green">
                +${(amount / 100).toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {state === "already_credited"
                  ? "This payment was already added to your wallet."
                  : "Your wallet has been credited successfully."}
              </p>
              <Button
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/80"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h2 className="mt-4 font-arcade text-sm text-foreground">Verification Failed</h2>
              <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
              <div className="mt-6 flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/80"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;
