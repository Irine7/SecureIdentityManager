import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  User,
  Shield,
  Settings,
  CreditCard,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = user?.role === "admin";

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const menuItems = [
    {
      name: t("dashboard"),
      icon: Home,
      path: "/",
      active: location === "/",
    },
    {
      name: t("profile"),
      icon: User,
      path: "/profile",
      active: location.startsWith("/profile"),
    },
    {
      name: t("subscription"),
      icon: CreditCard,
      path: "/subscription",
      active: location === "/subscription",
    },
  ];

  if (isAdmin) {
    menuItems.push({
      name: t("admin"),
      icon: Shield,
      path: "/admin",
      active: location.startsWith("/admin"),
    });
  }

  return (
    <div
      className={cn(
        "h-screen bg-sidebar dark:bg-sidebar border-r border-sidebar-border dark:border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border dark:border-sidebar-border">
        {!collapsed && (
          <span className="text-xl font-bold text-sidebar-foreground dark:text-sidebar-foreground">SecureAuth</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="text-sidebar-foreground dark:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight /> : <ChevronDown />}
        </Button>
      </div>

      <div className="py-4">
        <ul className="space-y-2 px-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", collapsed ? "mx-0" : "mr-2")} />
                  {!collapsed && <span>{item.name}</span>}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
