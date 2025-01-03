import * as React from 'react';
import { type ClassValue } from 'clsx';

export interface User {
  id: string;
  created_at: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export type VariantProps<Component> = {
  [key in keyof Component]: Component[key] extends string | number | boolean
    ? Component[key]
    : never;
};

export type ClassNameValue = ClassValue;

export type WithClassName<T = unknown> = T & {
  className?: string;
};