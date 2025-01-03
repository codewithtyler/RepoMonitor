declare module 'class-variance-authority' {
  export function cva(base: string, config?: {
    variants?: Record<string, Record<string, string>>;
    defaultVariants?: Record<string, string>;
    compoundVariants?: Array<Record<string, string> & { class: string }>;
  }): (props?: Record<string, string>) => string;

  export function cx(...inputs: Array<string | undefined | null | boolean>): string;
} 