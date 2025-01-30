import { theme } from '@/config/theme';
import { useActiveAnalyses } from '@/lib/contexts/active-analyses-context';
import { Loader2 } from 'lucide-react';

export function ActiveAnalysisGlobalCard() {
    const { activeCount } = useActiveAnalyses();

    return (
        <div className="p-4 rounded-lg border transition-colors" style={{ borderColor: theme.colors.border.primary, backgroundColor: theme.colors.background.secondary }}>
            <h3 className="text-sm font-medium" style={{ color: theme.colors.text.secondary }}>
                Active Analysis
            </h3>
            <div className="mt-2 flex items-center gap-2">
                {activeCount > 0 && <Loader2 className="w-4 h-4 animate-spin" style={{ color: theme.colors.brand.primary }} />}
                <p className="text-3xl font-semibold tracking-tight" style={{ color: theme.colors.text.primary }}>
                    {activeCount}
                </p>
            </div>
            <p className="mt-2 text-sm" style={{ color: theme.colors.text.secondary }}>
                {activeCount === 1 ? 'Repository currently being analyzed' : 'Repositories currently being analyzed'}
            </p>
        </div>
    );
}
