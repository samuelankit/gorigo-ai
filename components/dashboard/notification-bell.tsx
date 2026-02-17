"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  CreditCard,
  PhoneOff,
  Send,
  Webhook,
  Shield,
  Info,
} from "lucide-react";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "low_balance":
    case "spending_cap":
      return <CreditCard className="h-4 w-4 text-amber-500" />;
    case "call_failure":
      return <PhoneOff className="h-4 w-4 text-red-500" />;
    case "campaign_complete":
      return <Send className="h-4 w-4 text-emerald-500" />;
    case "webhook_failure":
      return <Webhook className="h-4 w-4 text-orange-500" />;
    case "security":
      return <Shield className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const prevUnreadRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      const newUnread = data.unreadCount || 0;
      setNotifications(data.notifications || []);
      setUnreadCount(newUnread);

      if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        setHasNewAlert(true);
        setTimeout(() => setHasNewAlert(false), 3000);
      }
      prevUnreadRef.current = newUnread;
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
      setHasNewAlert(false);
    }
  }, [open, fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await fetch("/api/notifications/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PUT",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className={`h-4 w-4 transition-transform ${hasNewAlert ? "animate-bell-shake" : ""}`} />
          {unreadCount > 0 && (
            <>
              <span
                className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                data-testid="badge-unread-count"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
              {hasNewAlert && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-testid="popover-notifications">
        <div className="flex items-center justify-between gap-2 p-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={markAllRead}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 hover-elevate cursor-pointer border-b border-border/50 ${
                    !n.isRead ? "bg-accent/30" : ""
                  }`}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                    if (n.actionUrl) window.location.href = n.actionUrl;
                  }}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
