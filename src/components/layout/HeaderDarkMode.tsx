import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function HeaderDarkMode() {
  const { theme, setTheme } = useTheme();

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Le thème est soit "dark" soit "light", jamais "system"
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className="h-8 w-8 sm:h-9 sm:w-9 transition-transform hover:scale-110"
      title={isDark ? "Mode clair" : "Mode sombre"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 sm:h-5 sm:w-5 transition-all" />
      ) : (
        <Moon className="h-4 w-4 sm:h-5 sm:w-5 transition-all" />
      )}
    </Button>
  );
}