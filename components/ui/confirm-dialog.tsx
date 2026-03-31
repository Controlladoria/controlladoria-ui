"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const icons = {
    danger: <AlertCircle className="w-7 h-7 text-destructive" />,
    warning: <AlertTriangle className="w-7 h-7 text-yellow-600 dark:text-yellow-500" />,
    info: <Info className="w-7 h-7 text-blue-600 dark:text-blue-500" />,
  };

  const buttonStyles = {
    danger: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    warning: "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white",
    info: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icons[variant]}
            <DialogTitle className="text-2xl">{title || "Confirmação"}</DialogTitle>
          </div>
          <DialogDescription className="text-lg pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-base px-6 py-3"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={`${buttonStyles[variant]} text-base px-6 py-3`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
