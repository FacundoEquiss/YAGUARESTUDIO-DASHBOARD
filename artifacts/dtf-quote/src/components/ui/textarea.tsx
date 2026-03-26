import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl bg-gray-900 px-4 py-3 text-base text-gray-100 outline-none ring-offset-background placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none shadow-[0_0_0_1.5px_#374151] focus:shadow-[0_0_0_2px_#f97316]",
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
