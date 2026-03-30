import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl bg-muted/60 dark:bg-gray-900 px-4 py-3 text-base text-foreground dark:text-gray-100 outline-none border border-border dark:border-0 ring-offset-background placeholder:text-muted-foreground dark:placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none dark:shadow-[0_0_0_1.5px_#374151] focus:border-primary dark:focus:shadow-[0_0_0_2px_#f97316] focus:outline-none",
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
