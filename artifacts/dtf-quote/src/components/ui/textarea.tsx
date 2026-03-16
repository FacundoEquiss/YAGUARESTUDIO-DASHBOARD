import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl bg-white px-4 py-3 text-base text-black outline-none ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none shadow-[0_0_0_1.5px_#e5e7eb] focus:shadow-[0_0_0_2px_#f97316] dark:bg-white dark:shadow-[0_0_0_1.5px_#374151] dark:text-black dark:placeholder:text-gray-500 dark:focus:shadow-[0_0_0_2px_#f97316]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
