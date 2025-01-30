/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from 'react';

declare module 'react' {
    interface FunctionComponent<P = {}> {
        (props: P, context?: any): ReactElement<any, any> | null;
        displayName?: string;
        defaultProps?: Partial<P>;
    }

    interface FC<P = {}> extends FunctionComponent<P> { }

    interface ComponentType<P = {}> {
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
        interface IntrinsicElements extends React.JSX.IntrinsicElements { }
    }
}
