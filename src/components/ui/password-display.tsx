import { useState } from "react";
import { Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "./button";

interface PasswordDisplayProps {
  password: string;
  onCopy?: (password: string) => void;
}

export function PasswordDisplay({ password, onCopy }: PasswordDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(password);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="text-sm bg-muted px-2 py-1 rounded min-w-[100px]">
        {isVisible ? password : "••••••••"}
      </code>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(!isVisible)}
        title={isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        title="Copier le mot de passe"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
