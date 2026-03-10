import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("skill-status-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "skills",
          filter: `creator_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string;
          const skillName = payload.new.display_name as string;

          if (newStatus === "approved" || newStatus === "rejected") {
            const msg =
              newStatus === "approved"
                ? t("notifications.skillApproved", { name: skillName })
                : t("notifications.skillRejected", { name: skillName });

            const notif: Notification = {
              id: crypto.randomUUID(),
              message: msg,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [notif, ...prev].slice(0, 20));
            toast(msg, {
              icon: newStatus === "approved" ? "✅" : "❌",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, t]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={t("notifications.label")}
          className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">{t("notifications.title")}</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("notifications.empty")}
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 text-sm border-b border-border last:border-0 ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <p>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.timestamp.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
