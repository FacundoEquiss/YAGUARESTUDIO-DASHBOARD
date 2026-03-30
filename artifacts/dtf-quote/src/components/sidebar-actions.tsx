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
    <div className="flex flex-col gap-0.5 w-full">
      <div className="px-3 mb-1">
        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
          Support
        </span>
      </div>

      <button
        onClick={handleFeedbackClick}
        className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-colors text-left w-full"
      >
        <MessageSquare className="h-[16px] w-[16px] shrink-0" />
        <span>Feedback</span>
      </button>

      <Link href="/support">
        <a className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
          location === "/support"
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground"
        )}>
          <HeadphonesIcon className="h-[16px] w-[16px] shrink-0" />
          <span>Help & Support</span>
        </a>
      </Link>

      <Link href="/settings">
        <a className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
          location === "/settings"
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground"
        )}>
          <Settings className="h-[16px] w-[16px] shrink-0" />
          <span>Settings</span>
        </a>
      </Link>

      {/* User card */}
      <div className="mt-1.5 pt-1.5 border-t border-black/8 dark:border-white/5">
        <UserCard />
      </div>

      <FeedbackModal isOpen={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
    </div>
  );
}
