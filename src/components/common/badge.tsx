import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

export function Badge({
  className = '',
  variant = 'default',
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold";
  const variantStyles = {
    default: "bg-blue-500 text-white",
    secondary: "bg-gray-100 text-gray-800",
    outline: "border border-gray-300 text-gray-700"
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}