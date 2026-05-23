import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, LogIn, LogOut, User } from "lucide-react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserCard() {
  const { currentUser, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!currentUser) {
    return (
      <button
        type="button"
        onClick={() => setLocation("/auth")}
        className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer group overflow-hidden text-left"
      >
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
          YE
        </div>
        <div className="flex-1 flex flex-col items-start gap-0 min-w-0">
          <span className="text-[13px] font-semibold leading-tight">Invitado</span>
          <span className="text-[11px] text-muted-foreground leading-tight">Iniciar sesion</span>
        </div>
        <LogIn className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
      </button>
    );
  }

  const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "Usuario";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer group overflow-hidden"
        >
          <div className="relative shrink-0">
            <Avatar className="h-7 w-7 border border-border bg-background">
              {currentUser.photoURL ? <AvatarImage src={currentUser.photoURL} /> : null}
              <AvatarFallback className="text-xs font-medium">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col items-start gap-0 min-w-0">
            <span className="text-[13px] font-semibold truncate leading-tight w-full text-left">{displayName}</span>
            <span className="text-[11px] text-muted-foreground truncate w-full leading-tight text-left">
              {currentUser.email}
            </span>
          </div>

          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]" align="center" side="top" sideOffset={12}>
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="text-destructive cursor-pointer focus:bg-destructive focus:text-destructive-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
