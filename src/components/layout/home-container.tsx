import * as React from "react";

interface HomeContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function HomeContainer({ className = '', ...props }: HomeContainerProps) {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center ${className}`}
      {...props}
    />
  );
}