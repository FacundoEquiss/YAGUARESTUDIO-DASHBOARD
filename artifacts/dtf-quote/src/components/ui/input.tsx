import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl bg-muted/60 dark:bg-gray-900 px-4 py-2 text-base text-foreground dark:text-gray-100 outline-none appearance-none border border-border dark:border-0 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground dark:placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 dark:shadow-[0_0_0_1.5px_#374151] focus:border-primary dark:focus:shadow-[0_0_0_2px_#f97316] focus:outline-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
