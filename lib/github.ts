import { Octokit } from '@octokit/rest';
import { Issue, Repository } from './types';

export class GitHubClient {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      retry: {
        enabled: true,
        retries: 3,
      },
    });
  }

  async getRepositories(): Promise<Repository[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      visibility: 'all',
      sort: 'updated',
      per_page: 100,
    });
    return data;
  }

  async getIssues(owner: string, repo: string): Promise<Issue[]> {
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 50,
    });
    return data;
  }

  async createIssue(owner: string, repo: string, title: string, body: string) {
    return this.octokit.issues.create({
      owner,
      repo,
      title,
      body,
    });
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    data: Partial<Issue>
  ) {
    return this.octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...data,
    });
  }
}