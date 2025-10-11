/**
 * ENHANCED BUTTON COMPONENT
 * 
 * UX Improvements:
 * - Subtle scale & shadow on hover (1.02x transform)
 * - Smooth transitions (120ms ease-in-out)
 * - Proper disabled states (reduced opacity, no hover)
 * - Unified border-radius (rounded-xl)
 * - Touch feedback für Mobile (active state)
 * 
 * Note: Simplified version without @radix-ui/react-slot dependency
 */

import * as React from "react";

// Variant styles mapping
const variantStyles = {
  default: "bg-primary text-primary-foreground shadow hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
  outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:scale-[1.01] active:scale-[0.99]",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
  ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
  link: "text-primary underline-offset-4 hover:underline"
};

// Size styles mapping
const sizeStyles = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10"
};

const Button = React.forwardRef(({ 
  className = "", 
  variant = "default", 
  size = "default", 
  children,
  disabled,
  ...props 
}, ref) => {
  // Build className string
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantClass = variantStyles[variant] || variantStyles.default;
  const sizeClass = sizeStyles[size] || sizeStyles.default;
  
  const finalClassName = `${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim();

  return (
    <button
      ref={ref}
      className={finalClassName}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
export default Button;