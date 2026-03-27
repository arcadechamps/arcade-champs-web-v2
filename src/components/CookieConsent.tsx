import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="container pb-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              We use cookies to improve your experience. By continuing, you agree to our{" "}
              <Link to="/privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">
                Privacy Policy
              </Link>.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={decline} className="text-muted-foreground">
              Decline
            </Button>
            <Button size="sm" onClick={accept} className="bg-primary text-primary-foreground hover:bg-primary/80">
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
