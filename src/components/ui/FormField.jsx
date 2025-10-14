import * as React from "react";
import { cn } from "../lib/utils";
import { Input } from "./input";
import { Label } from "./label";

const FormField = React.forwardRef(
  ({ className, label, name, ...props }, ref) => {
    // Generate a unique ID for the input to link the label correctly.
    const id = React.useId();

    return (
      <div className={cn("grid w-full max-w-sm items-center gap-1.5", className)}>
        {label && <Label htmlFor={id}>{label}</Label>}
        <Input ref={ref} id={id} name={name} {...props} />
      </div>
    );
  }
);
FormField.displayName = "FormField";

export { FormField };