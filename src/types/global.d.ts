declare module 'class-variance-authority' {
  export type VariantProps<T extends (...args: Record<string, unknown>[]) => string> = {
    [K in keyof Parameters<T>[0]]: Parameters<T>[0][K];
  };
  export function cva(base: string, config?: Record<string, unknown>): (...args: Record<string, unknown>[]) => string;
} 