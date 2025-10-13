import * as React from "react";
import { cva } from "class-variance-authority";

// Utility function for merging Tailwind classes
export function cn(...inputs) {
  // Note: For optimal class merging, install clsx and tailwind-merge
  // Then replace this with: return twMerge(clsx(inputs));
  return inputs.filter(Boolean).join(" ");
}

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-orange-500 text-white shadow hover:bg-orange-600 active:scale-[0.98]",
        secondary: "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 active:scale-[0.98]",
        destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600 active:scale-[0.98]",
        outline: "border border-gray-300 bg-white shadow-sm hover:bg-gray-50 hover:text-gray-900 active:scale-[0.99]",
        ghost: "hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
        link: "text-orange-500 underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";