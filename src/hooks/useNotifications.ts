import React from "react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
}

interface ConfirmationOptions {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const useNotifications = () => {
  const { toast } = useToast();

  const showSuccess = ({ title = "Succès", description, duration = 4000 }: NotificationOptions) => {
    sonnerToast.success(title, {
      description,
      duration,
      position: "top-center",
      style: {
        background: "hsl(var(--background))",
        border: "1px solid hsl(var(--success-border))",
        color: "hsl(var(--foreground))",
      },
      className: "animate-scale-in",
    });
  };

  const showError = ({ title = "Erreur", description, duration = 5000 }: NotificationOptions) => {
    sonnerToast.error(title, {
      description,
      duration,
      position: "top-center",
      style: {
        background: "hsl(var(--background))",
        border: "1px solid hsl(var(--destructive))",
        color: "hsl(var(--foreground))",
      },
      className: "animate-scale-in",
    });
  };

  const showConfirmation = async ({
    title,
    description,
    onConfirm,
    onCancel,
    confirmText = "Confirmer",
    cancelText = "Annuler"
  }: ConfirmationOptions): Promise<void> => {
    return new Promise((resolve) => {
      const handleConfirm = () => {
        onConfirm();
        resolve();
      };

      const handleCancel = () => {
        if (onCancel) onCancel();
        resolve();
      };

      sonnerToast.custom(
        (t) => React.createElement("div", 
          { className: "bg-background border border-border rounded-lg p-6 shadow-lg animate-scale-in max-w-md mx-auto" },
          React.createElement("div", 
            { className: "text-center" },
            React.createElement("h3", 
              { className: "text-lg font-semibold text-foreground mb-2" }, 
              title
            ),
            React.createElement("p", 
              { className: "text-muted-foreground mb-6" }, 
              description
            ),
            React.createElement("div", 
              { className: "flex gap-3 justify-center" },
              React.createElement("button", {
                onClick: () => {
                  sonnerToast.dismiss(t);
                  handleCancel();
                },
                className: "px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
              }, cancelText),
              React.createElement("button", {
                onClick: () => {
                  sonnerToast.dismiss(t);
                  handleConfirm();
                },
                className: "px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              }, confirmText)
            )
          )
        ),
        {
          duration: Infinity,
          position: "top-center",
        }
      );
    });
  };

  return {
    showSuccess,
    showError,
    showConfirmation,
  };
};