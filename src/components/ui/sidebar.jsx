import * as React from "react";

const Sidebar = React.forwardRef(({ className, ...props }, ref) => (
  <aside
    ref={ref}
    className={`h-screen w-[260px] flex-shrink-0 border-r bg-white ${className || ""}`}
    {...props}
  />
));
Sidebar.displayName = "Sidebar";

const SidebarContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`h-full overflow-y-auto ${className || ""}`}
    {...props}
  >
    {children}
  </div>
));
SidebarContent.displayName = "SidebarContent";

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`px-4 py-4 border-b ${className || ""}`}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`px-3 py-4 ${className || ""}`}
    {...props}
  />
));
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase ${className || ""}`}
    {...props}
  />
));
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`space-y-1 ${className || ""}`}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`space-y-1 ${className || ""}`}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={className || ""}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const SidebarMenuButton = React.forwardRef(
  ({ className, asChild = false, isActive = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button";
    
    const baseClasses = "w-full inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
    const activeClasses = isActive ? "bg-orange-500 text-white" : "text-gray-700 hover:bg-gray-100";
    
    if (asChild) {
      return React.cloneElement(props.children, {
        className: `${baseClasses} ${activeClasses} ${className || ""}`,
        ref
      });
    }
    
    return (
      <Comp
        ref={ref}
        className={`${baseClasses} ${activeClasses} ${className || ""}`}
        {...props}
      />
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarProvider = ({ children, ...props }) => {
  return <div {...props}>{children}</div>;
};

const SidebarTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className || ""}`}
    {...props}
  />
));
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`my-2 h-px bg-gray-200 ${className || ""}`}
    {...props}
  />
));
SidebarSeparator.displayName = "SidebarSeparator";

export {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
};