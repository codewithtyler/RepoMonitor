export interface Repository {
    id: string;
    owner: string;
    name: string;
    description: string | null;
    url: string;
    stargazersCount: number;
    forksCount: number;
    openIssuesCount: number;
    lastAnalysisTimestamp: string | null;
    isAnalyzing: boolean;
    createdAt: string;
    updatedAt: string;
}
