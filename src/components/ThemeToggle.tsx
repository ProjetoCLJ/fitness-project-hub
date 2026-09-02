import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Card className="p-4 sm:p-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
        </div>
        <div>
          <Label htmlFor="theme-toggle" className="font-medium cursor-pointer">Modo escuro</Label>
          <p className="text-sm text-muted-foreground">Ative para uma interface com tons escuros</p>
        </div>
      </div>
      <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={toggleTheme} />
    </Card>
  );
};
