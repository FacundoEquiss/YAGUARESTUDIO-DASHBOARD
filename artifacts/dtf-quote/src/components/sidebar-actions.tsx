import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, HeadphonesIcon, Settings } from "lucide-react";
import { FeedbackModal } from "./feedback-modal";
import { UserCard } from "./user-card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function SidebarActions() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [location] = useLocation();
  const { currentUser } = useAuth();

  const handleFeedbackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFeedbackOpen(true);
  };

  if (!currentUser || currentUser.role === "guest") {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 w-full pt-4">
      <div className="px-3 mb-2">
        <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
          Support
        </span>
      </div>

      <button
        onClick={handleFeedbackClick}
        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span>Feedback</span>
      </button>

      <Link href="/support">
        <a className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
          location === "/support"
            ? "bg-sidebar-accent text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}>
          <HeadphonesIcon className="h-4 w-4 shrink-0" />
          <span>Help & Support</span>
        </a>
      </Link>

      <Link href="/settings">
        <a className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
          location === "/settings"
            ? "bg-sidebar-accent text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}>
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </a>
      </Link>

      {/* User angular card mimicking SaaS style */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <UserCard />
      </div>

      {/* Modal is rendered out of normal UI flow */}
      <FeedbackModal isOpen={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
    </div>
  );
}
