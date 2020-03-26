const path = require("path");

import ConfigurationError from "./configuration-error";
import fetch from "./fetch";

export interface GitHubUserResponse {
  login: string;
  name: string;
  html_url: string;
}

export interface GitHubIssueResponse {
  number: number;
  title: string;
  pull_request?: {
    html_url: string;
  };
  labels: Array<{
    name: string;
  }>;
  user: {
    login: string;
    html_url: string;
  };
}

export interface Options {
  repo: string;
  rootPath: string;
  cacheDir?: string;
}

export default class GithubAPI {
  private cacheDir: string | undefined;
  private auth: string;

  constructor(config: Options) {
    this.cacheDir = config.cacheDir && path.join(config.rootPath, config.cacheDir, "github");
    this.auth = this.getAuthToken();
    if (!this.auth) {
      throw new ConfigurationError("Must provide GITHUB_AUTH");
    }
  }

  public getBaseIssueUrl(repo: string): string {
    return `https://gitlab.com/${repo}/-/issues/`;
  }

  public async getIssueData(repo: string, issue: string): Promise<GitHubIssueResponse> {
    return this._fetch(`https://gitlab.com/api/v4/projects/${repo.replace(/\//g, "%2F")}/issues/${issue}`).then(
      res => ({
        ...res,
        number: res.iid,
        labels: res.labels.map((name: string) => ({ name })),
        user: {
          login: res.author.username,
          html_url: res.author.web_url,
        },
      })
    );
  }

  public async getUserData(login: string): Promise<GitHubUserResponse> {
    return this._fetch(`https://gitlab.com/api/v4/users?username=${login}`).then(res => {
      const user = res[0];
      if (!user) return { login, name: login, html_for: `https://gitlab.com/${login}` };
      return { ...user, login: user.username, html_url: user.web_url };
    });
  }

  private async _fetch(url: string): Promise<any> {
    const res = await fetch(url, {
      cacheManager: this.cacheDir,
      headers: {
        Authorization: `token ${this.auth}`,
      },
    });
    const parsedResponse = await res.json();
    if (res.ok) {
      return parsedResponse;
    }
    throw new ConfigurationError(`Fetch error: ${res.statusText}.\n${JSON.stringify(parsedResponse)}`);
  }

  protected getAuthToken(): string {
    return process.env.AUTH_TOKEN || "";
  }
}
