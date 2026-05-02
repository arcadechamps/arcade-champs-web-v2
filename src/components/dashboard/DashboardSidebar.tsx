import {
  LayoutDashboard,
  Trophy,
  Gamepad2,
  Users,
  ShieldAlert,
  Mail,
  MailPlus,
  Wallet,
  History,
  Medal,
  UserCog,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface MenuItem {
  key: string;
  label: string;
  icon: React.ElementType;
}

const adminItems: MenuItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "contests", label: "Contest Manager", icon: Trophy },
  { key: "games", label: "Game Library", icon: Gamepad2 },
  { key: "players", label: "Player Directory", icon: Users },
  { key: "anticheat", label: "Anti-Cheat Control", icon: ShieldAlert },
  { key: "sessions", label: "Game Sessions", icon: History },
  { key: "leaderboards", label: "Leaderboards", icon: Medal },
  { key: "newsletter", label: "Newsletter", icon: Mail },
  { key: "emails", label: "Email Manager", icon: MailPlus },
];

const playerItems: MenuItem[] = [
  { key: "home", label: "Home Dashboard", icon: LayoutDashboard },
  { key: "wallet", label: "My Wallet", icon: Wallet },
  { key: "free-games", label: "Free Games", icon: Gamepad2 },
  { key: "contest-games", label: "Contest Games", icon: Trophy },
  { key: "contests", label: "Find Contests", icon: Trophy },
  { key: "sessions", label: "Play History", icon: History },
  { key: "leaderboards", label: "Leaderboards", icon: Medal },
  { key: "profile", label: "My Profile", icon: UserCog },
];

interface DashboardSidebarProps {
  isAdmin: boolean;
  activeSection: string;
}

/** Build the URL path for a sidebar menu item */
const buildPath = (isAdmin: boolean, key: string) => {
  if (isAdmin) {
    // "overview" is the index route → /dashboard/admin
    return key === "overview" ? "/dashboard/admin" : `/dashboard/admin/${key}`;
  }
  // "home" is the index route → /dashboard
  return key === "home" ? "/dashboard" : `/dashboard/${key}`;
};

const DashboardSidebar = ({ isAdmin, activeSection }: DashboardSidebarProps) => {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const items = isAdmin ? adminItems : playerItems;
  const groupLabel = isAdmin ? "Management" : "My Account";

  // Resolve the "index" key name for comparison
  const indexKey = isAdmin ? "overview" : "home";

  const navigate = useNavigate();

  useHotkeys('shift+1', () => navigate(buildPath(isAdmin, items[0].key)), { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+2', () => navigate(buildPath(isAdmin, items[1].key)), { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+3', () => navigate(buildPath(isAdmin, items[2].key)), { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+4', () => navigate(buildPath(isAdmin, items[3].key)), { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+5', () => navigate(buildPath(isAdmin, items[4].key)), { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+6', () => { if(items[5]) navigate(buildPath(isAdmin, items[5].key)); }, { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+7', () => { if(items[6]) navigate(buildPath(isAdmin, items[6].key)); }, { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+8', () => { if(items[7]) navigate(buildPath(isAdmin, items[7].key)); }, { preventDefault: true }, [isAdmin, items, navigate]);
  useHotkeys('shift+9', () => { if(items[8]) navigate(buildPath(isAdmin, items[8].key)); }, { preventDefault: true }, [isAdmin, items, navigate]);

  useHotkeys('shift+b', () => toggleSidebar(), { preventDefault: true }, [toggleSidebar]);

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" data-tour="sidebar">
      <SidebarHeader className="p-3">
        <Link to="/" className="logo-link flex items-center gap-2 overflow-hidden">
          <img src={logo} alt="Arcade Champs" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <span className="logo-text font-arcade text-[10px] text-primary text-glow-blue truncate">
              ARCADE CHAMPS
            </span>
          )}
        </Link>
        {!collapsed && (
          <span className="mt-2 font-arcade text-[9px] text-muted-foreground">
            {isAdmin ? "Admin Panel" : "Player Hub"}
          </span>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item, index) => {
                const isActive = activeSection === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={`${item.label} (Shift+${index + 1})`}
                      data-tour={`nav-${item.key}`}
                      className={
                        isActive
                          ? "bg-primary/15 text-primary font-medium"
                          : ""
                      }
                    >
                      <Link to={buildPath(isAdmin, item.key)} onClick={handleClick}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          tooltip="Collapse (Shift+B)"
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span className="ml-2 text-xs">Collapse (Shift+B)</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
