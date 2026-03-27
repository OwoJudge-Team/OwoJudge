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

interface GiteaPublicKey {
  id: number;
  key: string;
  title: string;
  fingerprint: string;
  created_at: string;
  read_only: boolean;
}

/**
 * Load the README content from the git_tutorial.md file
 * Falls back to a simple message if the file cannot be read
 */
const loadReadmeContent = (): string => {
  // In Docker, the docs are at /app/docs/
  // In development, they're at ../../docs/
  const dockerPath = '/app/docs/git_tutorial.md';
  const localPath = path.resolve(__dirname, '../../docs/git_tutorial.md');
  const tutorialPath = fs.existsSync(dockerPath) ? dockerPath : localPath;

  try {
    if (fs.existsSync(tutorialPath)) {
      return fs.readFileSync(tutorialPath, 'utf-8');
    }
  } catch (error) {
    console.error(`[Gitea] Failed to read git_tutorial.md: ${error}`);
  }

  // Fallback content if file cannot be read
  return `# OwoJudge Git Repository

Welcome to your OwoJudge Git repository!

Please refer to the OwoJudge documentation for instructions on how to submit your solutions.
`;
};

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
    // console.log(`[Gitea] Response:`, JSON.stringify(result, null, 2));
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

    // Create empty repo first
    const payload = {
      name: repoName,
      private: true,
      auto_init: false
    };

    const repo = await this.request<GiteaRepo>(endpoint, 'POST', payload);

    // Create README.md with tutorial content
    try {
      await this.createFile(username, repoName, 'README.md', {
        content: loadReadmeContent(),
        message: 'Initial commit: Add Git Tutorial',
        branch: defaultBranch
      });
    } catch (error) {
      console.error(`[Gitea] Failed to create README for ${repoName}:`, error);
      // We still return the repo even if README creation fails
    }

    return repo;
  }

  /**
   * Create a file in a repository
   */
  async createFile(
    owner: string,
    repo: string,
    filepath: string,
    options: {
      content: string,
      message: string,
      branch?: string
    }
  ): Promise<void> {
    const { content, message, branch } = options;
    const endpoint = `/api/v1/repos/${owner}/${repo}/contents/${filepath}`;

    const payload = {
      content: Buffer.from(content).toString('base64'),
      message,
      branch
    };

    await this.request(endpoint, 'POST', payload);
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

  /**
   * Get all public SSH keys for a user (admin operation)
   * @param username Username to get the keys for
   */
  async getUserPublicKeys(username: string): Promise<GiteaPublicKey[]> {
    const endpoint = `/api/v1/users/${username}/keys`;
    return this.request<GiteaPublicKey[]>(endpoint, 'GET');
  }

  /**
   * Delete a user's public SSH key (admin operation)
   * @param username Username whose key is to be deleted
   * @param keyId ID of the key to delete
   */
  async deletePublicKey(username: string, keyId: number): Promise<void> {
    const endpoint = `/api/v1/admin/users/${username}/keys/${keyId}`;
    await this.request<void>(endpoint, 'DELETE');
  }
}


// Export singleton instance
const giteaService = new GiteaService();

export {
  giteaService,
};
