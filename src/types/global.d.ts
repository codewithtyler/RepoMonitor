/// <reference types="react" />
/// <reference types="react-dom" />

import React from 'react';

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

declare module 'react' {
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): ReactElement<any, any> | null;
    displayName?: string;
    defaultProps?: Partial<P>;
  }

  interface FC<P = {}> extends FunctionComponent<P> { }

  interface ComponentType<P = any> {
    (props: P, context?: any): ReactElement<any, any> | null;
    defaultProps?: Partial<P>;
    displayName?: string;
  }

  interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }
}

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> { }
    interface ElementClass extends React.Component<any> { }
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }

    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      header: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h4: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h5: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h6: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
      form: React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
      label: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
      select: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;
      option: React.DetailedHTMLProps<React.OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>;
      textarea: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
      img: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
      a: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
      ul: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
      ol: React.DetailedHTMLProps<React.HTMLAttributes<HTMLOListElement>, HTMLOListElement>;
      li: React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>;
      table: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>;
      thead: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
      tbody: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
      tr: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement>;
      th: React.DetailedHTMLProps<React.ThHTMLAttributes<HTMLTableHeaderCellElement>, HTMLTableHeaderCellElement>;
      td: React.DetailedHTMLProps<React.TdHTMLAttributes<HTMLTableDataCellElement>, HTMLTableDataCellElement>;
    }
  }
}
