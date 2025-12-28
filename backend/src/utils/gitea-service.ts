import * as fs from 'fs';
import * as path from 'path';

interface GiteaConfig {
  baseUrl: string;
  token: string;
}

interface CreateRepoOptions {
  username: string;
  repoName?: string;
  description?: string;
  isPrivate?: boolean;
  defaultBranch?: string;
  readme?: string;
  template?: boolean;
  trustModel?: 'default' | 'collaborator' | 'committer' | 'collaboratorcommitter';
}

interface CreateUserOptions {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  mustChangePassword?: boolean;
}

interface GiteaUser {
  id: number;
  login: string;
  full_name: string;
  email: string;
  avatar_url: string;
  is_admin: boolean;
  created: string;
}

interface GiteaRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  clone_url: string;
  ssh_url: string;
  html_url: string;
  default_branch: string;
}

interface GiteaApiError {
  message: string;
  url: string;
}

class GiteaService {
  private config: GiteaConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): GiteaConfig {
    // In Docker, the secrets are mounted at /secrets/
    // In development, fall back to the local secrets folder
    const dockerPath = '/secrets/gitea_token.txt';
    const localPath = path.resolve(__dirname, '../../secrets/gitea_token.txt');
    const tokenPath = fs.existsSync(dockerPath) ? dockerPath : localPath;
    
    if (!fs.existsSync(tokenPath)) {
      throw new Error(`Gitea token file not found at: ${dockerPath} or ${localPath}`);
    }

    const token = fs.readFileSync(tokenPath, 'utf-8').trim();
    
    if (!token) {
      throw new Error('Gitea token is empty');
    }

    return {
      baseUrl: process.env.GITEA_BASE_URL || 'http://127.0.0.1:3000',
      token
    };
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: object
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    console.log(`[Gitea] ${method} ${url}`);
    if (body) {
      console.log(`[Gitea] Request body:`, JSON.stringify(body, null, 2));
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.config.token}`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Handle empty responses (like DELETE)
    const text = await response.text();

    if (!response.ok) {
      console.error(`[Gitea] Error ${response.status}: ${text}`);
      const error: GiteaApiError = {
        message: `Gitea API error: ${response.status} ${response.statusText} - ${text}`,
        url
      };
      throw error;
    }

    if (!text) {
      console.log(`[Gitea] Response: (empty)`);
      return {} as T;
    }

    const result = JSON.parse(text) as T;
    console.log(`[Gitea] Response:`, JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Create a new user in Gitea (admin operation)
   */
  async createUser(options: CreateUserOptions): Promise<GiteaUser> {
    const {
      username,
      email,
      password,
      fullName = username,
      mustChangePassword = false
    } = options;

    const endpoint = '/api/v1/admin/users';
    
    const payload = {
      username,
      email,
      password,
      full_name: fullName,
      must_change_password: mustChangePassword
    };

    return this.request<GiteaUser>(endpoint, 'POST', payload);
  }

  /**
   * Create a repository for a user (admin operation)
   */
  async createUserRepo(options: CreateRepoOptions): Promise<GiteaRepo> {
    const {
      username,
      repoName = `${username}-dsa`,
      description = `${username}'s repo`,
      isPrivate = true,
      defaultBranch = 'main',
      readme = '(no readme)',
      template = false,
      trustModel = 'default'
    } = options;

    const endpoint = `/api/v1/admin/users/${username}/repos`;
    
    const payload = {
      default_branch: defaultBranch,
      description,
      name: repoName,
      private: isPrivate,
      readme,
      template,
      trust_model: trustModel
    };

    return this.request<GiteaRepo>(endpoint, 'POST', payload);
  }

  /**
   * Get a user's repository
   */
  async getUserRepo(username: string, repoName: string): Promise<GiteaRepo | null> {
    try {
      const endpoint = `/api/v1/repos/${username}/${repoName}`;
      return await this.request<GiteaRepo>(endpoint);
    } catch (error) {
      // Return null if repo not found
      return null;
    }
  }

  /**
   * List all repositories for a user
   */
  async listUserRepos(username: string): Promise<GiteaRepo[]> {
    const endpoint = `/api/v1/users/${username}/repos`;
    return this.request<GiteaRepo[]>(endpoint);
  }

  /**
   * Delete a repository
   */
  async deleteRepo(owner: string, repoName: string): Promise<void> {
    const endpoint = `/api/v1/repos/${owner}/${repoName}`;
    await this.request<void>(endpoint, 'DELETE');
  }

  /**
   * Check if Gitea service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/api/v1/version');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
const giteaService = new GiteaService();

export { giteaService, GiteaService, CreateUserOptions, CreateRepoOptions, GiteaUser, GiteaRepo };
