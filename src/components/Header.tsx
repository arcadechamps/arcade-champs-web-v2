import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Wallet, LayoutDashboard } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Contests", path: "/contest" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Live Scores", path: "/live-leaderboards" },
  { label: "Free Games", path: "/games" },
  { label: "About Us", path: "/about" },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, profile, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const queryClient = useQueryClient();

  // Scroll listener for sticky header transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Realtime listener: auto-refresh balance when wallets row changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("wallet-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wallet-balance", user.id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: balanceCents = null } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("balance_cents").eq("user_id", user!.id).maybeSingle();
      return data?.balance_cents ?? 0;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "?");

  const isDashboard = location.pathname === "/dashboard";

  const profileDropdown = (avatarSize = "h-9 w-9") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full ring-2 ring-primary/60 ring-offset-2 ring-offset-background transition-all hover:ring-primary focus-visible:outline-none focus-visible:ring-primary">
          <Avatar className={`${avatarSize} cursor-pointer`}>
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.display_name ?? "Avatar"} />
            <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.display_name ?? "Avatar"} />
            <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{profile?.display_name || "Player"}</span>
            <span className="text-xs font-normal text-muted-foreground truncate">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center justify-between cursor-default"
          onSelect={(e) => e.preventDefault()}
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" /> Balance
          </span>
          <span className="font-mono font-semibold text-primary">
            ${balanceCents !== null ? (balanceCents / 100).toFixed(2) : "—"}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/dashboard")}>
          <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 transition-all duration-500 border-b",
        isScrolled 
          ? "border-white/10 bg-background/60 backdrop-blur-lg lg:bg-background/40 lg:backdrop-blur-xl shadow-2xl shadow-black/40 py-0" 
          : "border-transparent bg-transparent py-2"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        {!isDashboard && (
          <Link to="/" className="logo-link flex items-center gap-2">
            <img src={logo} alt="Arcade Champs" className="h-10 w-10 object-contain" />
            <span className="logo-text font-arcade text-sm text-primary text-glow-blue">ARCADE CHAMPS</span>
          </Link>
        )}

        {!isDashboard && (
          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path ? "text-primary text-glow-blue" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop profile/CTA */}
        <div className={`hidden items-center gap-3 lg:flex ${isDashboard ? "ml-auto" : ""}`}>
          {user ? (
            profileDropdown("h-9 w-9")
          ) : (
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/80 neon-border px-6 font-bold animate-pulse hover:animate-none"
              asChild
            >
              <Link to="/signup">Play Now</Link>
            </Button>
          )}
        </div>

        {/* Mobile profile/CTA */}
        <div className={`flex items-center lg:hidden ${isDashboard ? "ml-auto" : ""}`}>
          {user ? (
            profileDropdown("h-8 w-8")
          ) : (
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/80 neon-border px-5 font-bold animate-pulse hover:animate-none"
              asChild
            >
              <Link to="/signup">Play Now</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
