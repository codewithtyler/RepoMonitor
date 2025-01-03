export interface Database {
  public: {
    Tables: {
      repositories: {
        Row: {
          id: number;
          name: string;
          full_name: string;
          description: string | null;
          private: boolean;
          html_url: string;
          created_at: string;
          updated_at: string;
          pushed_at: string;
          git_url: string;
          ssh_url: string;
          clone_url: string;
          homepage: string | null;
          size: number;
          stargazers_count: number;
          watchers_count: number;
          language: string | null;
          forks_count: number;
          archived: boolean;
          disabled: boolean;
          open_issues_count: number;
          license: {
            key: string;
            name: string;
            spdx_id: string;
            url: string;
          } | null;
          topics: string[];
          visibility: string;
          default_branch: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
} 