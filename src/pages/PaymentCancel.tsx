import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md rounded-lg border border-border/50 bg-card p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-accent" />
          <h2 className="mt-4 font-arcade text-sm text-foreground">Payment Cancelled</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your payment was not completed. No charges were made to your account.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => navigate("/dashboard")}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentCancel;
