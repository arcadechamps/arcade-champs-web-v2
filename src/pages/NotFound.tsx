import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import { Gamepad2, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background bg-grid relative overflow-hidden">
      <PageMeta title="404 Not Found" description="The page you are looking for does not exist on Arcade Champs." />
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-accent/10 blur-[100px]" />

      <div className="relative z-10 text-center px-6 max-w-lg">
        <Gamepad2 className="mx-auto mb-6 h-16 w-16 text-accent animate-pulse" />

        <h1
          className={`text-6xl md:text-8xl font-arcade mb-4 text-glow-pink transition-all ${
            glitch ? "translate-x-1 skew-x-2 text-primary" : "text-accent"
          }`}
        >
          404
        </h1>

        <p className="font-arcade text-xs md:text-sm text-primary mb-2 text-glow-blue tracking-wider">
          GAME OVER
        </p>

        <p className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed">
          The level you're looking for doesn't exist.
          <br />
          <span className="text-foreground/50 text-xs font-mono">{location.pathname}</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="neon-border gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 border-border hover:bg-secondary">
            <Link to="/games">
              <Gamepad2 className="h-4 w-4" />
              Browse Games
            </Link>
          </Button>
        </div>

        <p className="mt-10 text-muted-foreground text-[10px] font-arcade tracking-widest animate-pulse">
          INSERT COIN TO CONTINUE
        </p>
      </div>
    </div>
  );
};

export default NotFound;
