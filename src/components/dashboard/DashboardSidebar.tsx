import {
  LayoutDashboard,
  Trophy,
  Gamepad2,
  Users,
  ShieldAlert,
  Mail,
  Wallet,
  History,
  Medal,
  UserCog,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
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
  { key: "newsletter", label: "Newsletter", icon: Mail },
];

const playerItems: MenuItem[] = [
  { key: "home", label: "Home Dashboard", icon: LayoutDashboard },
  { key: "free-games", label: "Free Games", icon: Gamepad2 },
  { key: "contest-games", label: "Contest Games", icon: Trophy },
  { key: "contests", label: "Find Contests", icon: Trophy },
  { key: "wallet", label: "My Wallet", icon: Wallet },
  { key: "sessions", label: "Play History", icon: History },
  { key: "leaderboards", label: "Leaderboards", icon: Medal },
  { key: "profile", label: "My Profile", icon: UserCog },
];

interface DashboardSidebarProps {
  isAdmin: boolean;
  activeSection: string;
  onSelect: (key: string) => void;
}

const DashboardSidebar = ({ isAdmin, activeSection, onSelect }: DashboardSidebarProps) => {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const items = isAdmin ? adminItems : playerItems;
  const groupLabel = isAdmin ? "Management" : "My Account";

  const handleSelect = (key: string) => {
    onSelect(key);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" data-tour="sidebar">
      <SidebarHeader className="p-3">
        <Link to="/" className="flex items-center gap-2 overflow-hidden">
          <img src={logo} alt="Arcade Champs" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <span className="font-arcade text-[10px] text-primary text-glow-blue truncate">
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
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={activeSection === item.key}
                    tooltip={item.label}
                    onClick={() => handleSelect(item.key)}
                    data-tour={`nav-${item.key}`}
                    className={
                      activeSection === item.key
                        ? "bg-primary/15 text-primary font-medium"
                        : ""
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
