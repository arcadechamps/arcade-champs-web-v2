import { Link, useLocation } from "react-router-dom";
import { Home, Info, Gamepad2, Trophy, LayoutDashboard, Zap } from "lucide-react";
import { useRef, useEffect } from "react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Contests", path: "/contest", icon: Trophy },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
  { label: "Live Scores", path: "/live-leaderboards", icon: Zap },
  { label: "Free Games", path: "/games", icon: Gamepad2 },
  { label: "About Us", path: "/about", icon: Info },
];

const BottomNav = () => {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [location.pathname]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl lg:hidden">
      <div ref={scrollRef} className="flex w-full items-center gap-1 overflow-x-auto px-2 py-2 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              ref={isActive ? activeRef : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-full p-1.5 transition-all duration-300 ${
                  isActive ? "bg-primary/15 shadow-lg shadow-primary/20" : ""
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-all duration-300 ${isActive ? "scale-110" : ""}`} />
              </div>
              <span className={`transition-all duration-300 ${isActive ? "text-primary font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
