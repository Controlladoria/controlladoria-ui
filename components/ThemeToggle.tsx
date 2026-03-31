"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes = [
    {
      value: "light" as const,
      label: "Claro",
      icon: Sun,
      description: "Sempre usar tema claro",
    },
    {
      value: "dark" as const,
      label: "Escuro",
      icon: Moon,
      description: "Sempre usar tema escuro",
    },
    {
      value: "system" as const,
      label: "Sistema",
      icon: Monitor,
      description: "Seguir preferência do sistema",
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          {resolvedTheme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Escolher Tema</DialogTitle>
          <DialogDescription>
            Selecione como você deseja visualizar o sistema
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {themes.map((t) => {
            const Icon = t.icon;
            const isSelected = theme === t.value;

            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`
                  flex items-start gap-4 p-4 rounded-lg border-2 transition-all
                  ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }
                `}
              >
                <div
                  className={`
                  p-2 rounded-md
                  ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}
                `}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-base flex items-center gap-2">
                    {t.label}
                    {isSelected && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {t.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
