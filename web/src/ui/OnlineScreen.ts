// Online screen: login/register, browse public levels, play, publish, and
// handle sharing invitations. Talks to the backend through ApiClient.

import { ApiClient, type LevelMeta } from '../online/ApiClient';
import { type LevelData } from '../levels/Level';
import { h, button, clear } from './dom';

export class OnlineScreen {
  private root: HTMLElement;

  constructor(
    private api: ApiClient,
    private onPlay: (level: LevelData) => void,
    private onBack: () => void,
    private getPublishLevel: () => LevelData,
  ) {
    this.root = h('div', { class: 'screen' });
  }

  get element(): HTMLElement {
    return this.root;
  }

  refresh(): void {
    this.render();
  }

  private render(): void {
    clear(this.root);
    const title = h('div', { class: 'logo', style: 'font-size:40px' }, 'ONLINE LEVELS');
    this.root.appendChild(title);

    if (!this.api.loggedIn) {
      this.renderAuth();
    } else {
      void this.renderDashboard();
    }
  }

  private renderAuth(): void {
    const userInput = h('input', { type: 'text', placeholder: 'username' });
    const passInput = h('input', { type: 'password', placeholder: 'password (min 8 chars)' });
    const error = h('div', { style: 'color:#ff5b6e; min-height:18px; font-size:13px' });
    const doLogin = async (): Promise<void> => {
      error.textContent = '';
      try {
        await this.api.login(userInput.value, passInput.value);
        this.render();
      } catch (e) {
        error.textContent = (e as Error).message;
      }
    };
    const doRegister = async (): Promise<void> => {
      error.textContent = '';
      try {
        await this.api.register(userInput.value, passInput.value);
        this.render();
      } catch (e) {
        error.textContent = (e as Error).message;
      }
    };
    this.root.appendChild(
      h('div', { class: 'panel' },
        h('h2', {}, 'Sign in'),
        userInput,
        passInput,
        error,
        button('LOGIN', () => void doLogin(), 'primary'),
        button('REGISTER', () => void doRegister()),
        button('← BACK', () => this.onBack(), 'danger'),
      ),
    );
  }

  private async renderDashboard(): Promise<void> {
    const me = await this.api.me();
    const header = h('div', { class: 'panel' },
      h('h2', {}, `👤 ${me.username}`),
      h('div', { class: 'row' },
        h('label', {}, `⭐ ${me.stars}  💎 ${me.diamonds}  🪙 ${me.userCoins}`),
      ),
      h('div', { class: 'row' },
        button('PUBLISH CURRENT LEVEL', () => void this.publish(), 'primary'),
        button('LOGOUT', () => void this.logout(), 'danger'),
        button('← BACK', () => this.onBack()),
      ),
    );
    this.root.appendChild(header);

    const list = h('div', { class: 'menu-col', style: 'max-height:40vh; overflow:auto' });
    this.root.appendChild(list);

    const err = h('div', { style: 'color:#ff5b6e; font-size:13px' });
    this.root.appendChild(err);

    try {
      const r = await this.api.listLevels('', 1);
      if (r.levels.length === 0) list.appendChild(h('div', { class: 'subtitle' }, 'no public levels yet'));
      for (const meta of r.levels) {
        list.appendChild(button(`${meta.name} — ${meta.owner}  (${meta.downloads} plays)`, () => void this.play(meta)));
      }
      // invitations
      const inv = await this.api.listInvitations();
      for (const i of inv.invitations) {
        list.appendChild(button(`📨 "${i.levelName}" from ${i.owner} [ACCEPT]`, () => void this.accept(i.id)));
      }
    } catch (e) {
      err.textContent = 'Backend unreachable: ' + (e as Error).message;
    }
  }

  private async play(meta: LevelMeta): Promise<void> {
    try {
      const r = await this.api.getLevel(meta.id);
      this.onPlay(r.data as LevelData);
    } catch (e) {
      alert('Failed to download level: ' + (e as Error).message);
    }
  }

  private async publish(): Promise<void> {
    const level = this.getPublishLevel();
    try {
      await this.api.createLevel({
        name: level.name,
        description: level.description,
        difficulty: level.difficulty,
        visibility: 'public',
        data: level,
      });
      this.render();
    } catch (e) {
      alert('Publish failed: ' + (e as Error).message);
    }
  }

  private async accept(id: number): Promise<void> {
    try {
      await this.api.acceptInvitation(id);
      this.render();
    } catch (e) {
      alert('Accept failed: ' + (e as Error).message);
    }
  }

  private async logout(): Promise<void> {
    await this.api.logout();
    this.render();
  }
}
