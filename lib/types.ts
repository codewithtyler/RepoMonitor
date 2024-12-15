export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  access_token: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  autoSync: boolean;
  notificationsEnabled: boolean;
  defaultRepository?: string;
}

export interface Repository {
  id: number;
  full_name: string;
  description: string;
  private: boolean;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Label[];
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  assignees: {
    login: string;
    avatar_url: string;
  }[];
}

export interface Label {
  id: number;
  name: string;
  description?: string;
  color: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface IssueEmbedding {
  id: number;
  issueId: number;
  embedding: number[];
  content: string;
  repository: string;
  created_at: string;
}