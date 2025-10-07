import { Bell, Check, CheckCheck, Megaphone, AlertTriangle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationsSystem } from "@/hooks/useNotificationsSystem";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: string, icon: string) => {
  if (icon === 'alert-circle') return AlertCircle;
  if (icon === 'alert-triangle') return AlertTriangle;
  if (icon === 'megaphone') return Megaphone;
  return Bell;
};

export function HeaderNotifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotificationsSystem();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 bg-background border-border z-50">
        <div className="flex items-center justify-between px-4 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type, notification.icon);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative border-b border-border last:border-0",
                    !notification.is_read && "bg-muted/30"
                  )}
                >
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "flex-shrink-0 mt-1",
                        notification.type === 'subscription' && "text-destructive",
                        notification.type === 'announcement' && "text-primary",
                        notification.type === 'alert' && "text-destructive",
                        notification.type === 'system' && "text-muted-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium line-clamp-1",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 h-2 w-2 bg-primary rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}