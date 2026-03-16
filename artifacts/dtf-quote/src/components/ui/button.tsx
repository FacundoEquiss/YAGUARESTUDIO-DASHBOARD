import * as React from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "glass";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          
          variant === "default" && "bg-gradient-to-b from-primary to-orange-600 text-primary-foreground shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)]",
          variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === "outline" && "border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
          variant === "ghost" && "hover:bg-accent/50 hover:text-accent-foreground",
          variant === "destructive" && "bg-destructive/10 text-destructive hover:bg-destructive/20",
          variant === "glass" && "bg-white/50 backdrop-blur-md border border-white/40 text-foreground shadow-sm hover:bg-white/60",
          
          size === "default" && "h-12 px-6 py-2",
          size === "sm" && "h-9 rounded-lg px-4 text-sm",
          size === "lg" && "h-14 rounded-2xl px-8 text-lg",
          size === "icon" && "h-12 w-12",
          
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
