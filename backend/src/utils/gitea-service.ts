import * as fs from 'fs';
import * as path from 'path';

interface GiteaConfig {
  baseUrl: string;
  token: string;
}

interface CreateRepoOptions {
  username: string;
  repoName?: string;
  defaultBranch?: string;
}

interface CreateUserOptions {
  username: string;
  password: string;
  email: string;
}

interface GiteaUser {
  id: number;
}

interface GiteaRepo {
  name: string;
  ssh_url: string;
}

interface GiteaApiError {
  message: string;
  url: string;
}

interface GiteaFileContent {
  name: string;
  content: string;
  size: number;
}



interface AddPublicKeyOptions {
  key: string;
  read_only?: boolean;
  title?: string;
}

class GiteaService {
  private _config: GiteaConfig | null = null;

  constructor() {
    // Don't load config here - delay until first use
  }

  private get config(): GiteaConfig {
    if (!this._config) {
      this._config = this.loadConfig();
    }
    return this._config;
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
      password,
      email
    } = options;

    const endpoint = '/api/v1/admin/users';

    const payload = {
      username,
      password,
      email
    };
    const user = await this.request<GiteaUser>(endpoint, 'POST', payload);
    return user;
  }

  /**
   * Create a repository for a user (admin operation)
   * Returns the SSH URL of the created repository
   */
  async createUserRepo(options: CreateRepoOptions): Promise<GiteaRepo> {
    const {
      username,
      repoName = `${username}-dsa`,
      defaultBranch = 'main',
    } = options;

    const endpoint = `/api/v1/admin/users/${username}/repos`;

    const payload = {
      default_branch: defaultBranch,
      name: repoName,
      private: false,
    };

    const repo = await this.request<GiteaRepo>(endpoint, 'POST', payload);
    return repo
  }

  /**
   * Delete a user from Gitea (admin operation)
   */
  async deleteUser(username: string): Promise<void> {
    const endpoint = `/api/v1/admin/users/${username}`;
    return this.request<void>(endpoint, 'DELETE');
  }

  /**
   * Get file content from a repository
   * @param owner Repository owner username
   * @param repo Repository name
   * @param filepath Path to the file in the repository
   * @param ref Branch, tag, or commit SHA (default: main branch)
   */
  async getFileContent(
    owner: string,
    repo: string,
    filepath: string,
    ref: string
  ): Promise<GiteaFileContent> {
    let endpoint = `/api/v1/repos/${owner}/${repo}/contents/${filepath}?ref=${ref}`;
    return this.request<GiteaFileContent>(endpoint);
  }

  /**
   * Add a public SSH key to a user's account (admin operation)
   * @param username Username to add the key to
   * @param options Key options including the key content, read_only flag, and title
   */
  async addPublicKey(username: string, options: AddPublicKeyOptions): Promise<void> {
    const { key, read_only = true, title = 'OwoJudge SSH Key' } = options;

    const endpoint = `/api/v1/admin/users/${username}/keys`;

    const payload = {
      key,
      read_only,
      title
    };

    await this.request(endpoint, 'POST', payload);
  }
}


// Export singleton instance
const giteaService = new GiteaService();

export {
  giteaService,
};
