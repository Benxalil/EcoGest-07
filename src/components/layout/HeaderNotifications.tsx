import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeaderNotifications() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 relative"
    >
      <Bell className="h-4 w-4" />
      {/* Badge optionnel pour les notifications non lues */}
      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
    </Button>
  );
}