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
          "flex h-12 w-full rounded-xl bg-white px-4 py-2 text-base text-black outline-none ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-[0_0_0_1.5px_#e5e7eb] focus:shadow-[0_0_0_2px_#f97316] dark:bg-white dark:shadow-[0_0_0_1.5px_#374151] dark:text-black dark:placeholder:text-gray-500 dark:focus:shadow-[0_0_0_2px_#f97316]",
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
