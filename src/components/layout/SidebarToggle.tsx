import { Menu, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ isCollapsed, onToggle }: SidebarToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="absolute right-[-12px] top-3 h-8 w-8 rounded-full border bg-background shadow-md hover:bg-gray-100"
    >
      {isCollapsed ? (
        <Menu className="h-5 w-5" />
      ) : (
        <PanelLeftClose className="h-5 w-5" />
      )}
    </Button>
  );
}