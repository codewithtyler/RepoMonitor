export interface Repository {
    id: string;
    name: string;
    fullName: string;
    description: string | null;
    url: string;
    openIssuesCount: number;
    lastAnalysisTimestamp: string | null;
    isAnalyzing: boolean;
    createdAt: string;
    updatedAt: string;
}
