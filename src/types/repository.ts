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
    visibility: 'public' | 'private';
    defaultBranch: string;
    permissions: {
        admin: boolean;
        push: boolean;
        pull: boolean;
    };
    topics: string[];
    language: string | null;
    size: number;
    hasIssues: boolean;
    isArchived: boolean;
    isDisabled: boolean;
    license: {
        key: string;
        name: string;
        url: string | null;
    } | null;
}
