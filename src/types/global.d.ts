/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace React {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    [key: string]: any;
  }
}

declare module '*.svg' {
  const content: any;
  export default content;
}

declare module '*.png' {
  const content: any;
  export default content;
}

declare module '*.jpg' {
  const content: any;
  export default content;
}

declare module '*.jpeg' {
  const content: any;
  export default content;
}

declare module '*.gif' {
  const content: any;
  export default content;
}

declare module '*.webp' {
  const content: any;
  export default content;
}

declare module 'class-variance-authority' {
  export type VariantProps<T extends (...args: Record<string, unknown>[]) => string> = {
    [K in keyof Parameters<T>[0]]: Parameters<T>[0][K];
  };
  export function cva(base: string, config?: Record<string, unknown>): (...args: Record<string, unknown>[]) => string;
}
