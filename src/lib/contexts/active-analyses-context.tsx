import { createContext, useContext, useState, useCallback } from 'react';

interface ActiveAnalysesContextType {
    activeCount: number;
    incrementActiveCount: () => void;
    decrementActiveCount: () => void;
}

const ActiveAnalysesContext = createContext<ActiveAnalysesContextType | null>(null);

export function ActiveAnalysesProvider({ children }: { children: React.ReactNode }) {
    const [activeCount, setActiveCount] = useState(0);

    const incrementActiveCount = useCallback(() => {
        setActiveCount(prev => prev + 1);
    }, []);

    const decrementActiveCount = useCallback(() => {
        setActiveCount(prev => Math.max(0, prev - 1));
    }, []);

    return (
        <ActiveAnalysesContext.Provider
            value={{
                activeCount,
                incrementActiveCount,
                decrementActiveCount
            }}
        >
            {children}
        </ActiveAnalysesContext.Provider>
    );
}

export function useActiveAnalyses() {
    const context = useContext(ActiveAnalysesContext);
    if (!context) {
        throw new Error('useActiveAnalyses must be used within an ActiveAnalysesProvider');
    }
    return context;
}
