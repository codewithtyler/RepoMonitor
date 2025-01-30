import 'react';

declare module 'react' {
    export const useState: <T>(initialState: T | (() => T)) => [T, (newState: T | ((prevState: T) => T)) => void];
    export const useEffect: (effect: () => void | (() => void), deps?: readonly any[]) => void;
    export const useCallback: <T extends (...args: any[]) => any>(callback: T, deps: readonly any[]) => T;
    export const useMemo: <T>(factory: () => T, deps: readonly any[]) => T;
    export const useRef: <T>(initialValue: T) => { current: T };
    export const useContext: <T>(context: React.Context<T>) => T;
    export const createContext: <T>(defaultValue: T) => React.Context<T>;
}
