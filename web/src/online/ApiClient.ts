// Typed HTTP client for the backend API. Persists the session token locally.
// The API base URL is configurable via VITE_API_URL at build time; the default
// is localhost:3000 for local development (never a hardcoded production host).

export interface UserProfile {
  id: number;
  username: string;
  icon: number;
  color1: number;
  color2: number;
  description: string;
  stars: number;
  diamonds: number;
  userCoins: number;
  creatorPoints: number;
  createdAt: number;
}

export interface LevelMeta {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  visibility: 'private' | 'specific' | 'unlisted' | 'public';
  version: number;
  ownerId: number;
  owner: string;
  createdAt: number;
  updatedAt: number;
  downloads: number;
  likes: number;
}

export interface SharePermissions {
  view?: boolean;
  play?: boolean;
  comment?: boolean;
  copy?: boolean;
  edit?: boolean;
}

const TOKEN_KEY = 'gdr:token';

export class ApiClient {
  private base: string;
  private token: string | null = null;

  constructor(base?: string) {
    this.base = base || this.defaultBase();
    try {
      this.token = localStorage.getItem(TOKEN_KEY);
    } catch {
      this.token = null;
    }
  }

  private defaultBase(): string {
    const w = globalThis as { GDR_API_URL?: string };
    const configured = w.GDR_API_URL;
    return (configured && configured.trim()) || 'http://localhost:3000';
  }

  get loggedIn(): boolean {
    return this.token !== null;
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) {
      const msg = (json as { error?: string } | null)?.error ?? `request failed (${res.status})`;
      throw new ApiError(msg, res.status);
    }
    return json as T;
  }

  async register(username: string, password: string): Promise<UserProfile> {
    const r = await this.req<{ token: string; user: UserProfile }>('POST', '/api/register', { username, password });
    this.setToken(r.token);
    return r.user;
  }

  async login(username: string, password: string): Promise<UserProfile> {
    const r = await this.req<{ token: string; user: UserProfile }>('POST', '/api/login', { username, password });
    this.setToken(r.token);
    return r.user;
  }

  async logout(): Promise<void> {
    try {
      await this.req('POST', '/api/logout');
    } finally {
      this.clearToken();
    }
  }

  async me(): Promise<UserProfile> {
    const r = await this.req<{ user: UserProfile }>('GET', '/api/me');
    return r.user;
  }

  async updateProfile(patch: { icon?: number; color1?: number; color2?: number; description?: string }): Promise<UserProfile> {
    const r = await this.req<{ user: UserProfile }>('PATCH', '/api/me', patch);
    return r.user;
  }

  async listLevels(query = '', page = 1): Promise<{ levels: LevelMeta[]; page: number; total: number; hasMore: boolean }> {
    const q = query ? `&q=${encodeURIComponent(query)}` : '';
    return this.req('GET', `/api/levels?page=${page}${q}`);
  }

  async getLevel(id: string): Promise<{ level: LevelMeta; data: unknown }> {
    return this.req('GET', `/api/levels/${id}`);
  }

  async createLevel(input: { name: string; description?: string; difficulty?: string; visibility?: string; data: unknown }): Promise<{ level: LevelMeta }> {
    return this.req('POST', '/api/levels', input);
  }

  async updateLevel(id: string, input: { data?: unknown; name?: string; description?: string; expectedVersion?: number }): Promise<{ level: LevelMeta }> {
    return this.req('PUT', `/api/levels/${id}`, input);
  }

  async publishLevel(id: string, visibility: string): Promise<{ level: LevelMeta }> {
    return this.req('POST', `/api/levels/${id}/publish`, { visibility });
  }

  async deleteLevel(id: string): Promise<{ ok: boolean }> {
    return this.req('DELETE', `/api/levels/${id}`);
  }

  async sharedWithMe(): Promise<{ levels: LevelMeta[] }> {
    return this.req('GET', '/api/shared-with-me');
  }

  async share(id: string, username: string, permissions: SharePermissions): Promise<{ invitationId: number }> {
    return this.req('POST', `/api/levels/${id}/share`, { username, permissions });
  }

  async listInvitations(): Promise<{ invitations: { id: number; levelId: string; levelName: string; owner: string; permissions: SharePermissions }[] }> {
    return this.req('GET', '/api/invitations');
  }

  async acceptInvitation(id: number): Promise<{ ok: boolean }> {
    return this.req('POST', `/api/invitations/${id}/accept`);
  }

  async rejectInvitation(id: number): Promise<{ ok: boolean }> {
    return this.req('POST', `/api/invitations/${id}/reject`);
  }

  async revokeShare(levelId: string, userId: number): Promise<{ ok: boolean }> {
    return this.req('DELETE', `/api/levels/${levelId}/share/${userId}`);
  }

  async searchUsers(q: string): Promise<{ users: UserProfile[] }> {
    return this.req('GET', `/api/users/search?q=${encodeURIComponent(q)}`);
  }

  async sendFriendRequest(username: string): Promise<{ ok: boolean }> {
    return this.req('POST', '/api/friends/request', { username });
  }

  async listFriends(): Promise<{ friends: UserProfile[] }> {
    return this.req('GET', '/api/friends');
  }

  async listFriendRequests(): Promise<{ requests: { id: number; username: string }[] }> {
    return this.req('GET', '/api/friend-requests');
  }

  async acceptFriendRequest(id: number): Promise<{ ok: boolean }> {
    return this.req('POST', `/api/friend-requests/${id}/accept`);
  }

  async listComments(levelId: string): Promise<{ comments: { id: number; username: string; body: string; createdAt: number }[] }> {
    return this.req('GET', `/api/levels/${levelId}/comments`);
  }

  async postComment(levelId: string, body: string): Promise<{ ok: boolean }> {
    return this.req('POST', `/api/levels/${levelId}/comments`, { body });
  }

  async listNotifications(): Promise<{ notifications: { id: number; type: string; text: string; read: boolean; createdAt: number }[] }> {
    return this.req('GET', '/api/notifications');
  }

  private setToken(token: string): void {
    this.token = token;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }

  private clearToken(): void {
    this.token = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}
