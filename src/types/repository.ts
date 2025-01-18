export interface Repository {
    id: string;
    github_id: number;
    owner: string;
    name: string;
    description: string | null;
    stargazersCount: number;
    forksCount: number;
    openIssuesCount: number;
    createdAt: string;
    updatedAt: string;
    url: string;
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
        url: string;
    } | null;
    lastAnalysisTimestamp: string | null;
    isAnalyzing: boolean;
}
