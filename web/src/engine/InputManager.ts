// Keyboard + pointer input, normalized into a per-frame action state.

export interface InputFrame {
  /** True exactly on the frame a press began. */
  pressed: boolean;
  /** True while the action button is held. */
  held: boolean;
}

export type InputAction = 'jump' | 'pause' | 'restart' | 'practice' | 'delete' | 'checkpoint';

export class InputManager {
  pressed = false;
  held = false;
  private pressedEdge = false;
  private heldState = false;

  /** Queued one-shot actions (keyboard). */
  private actionQueue: InputAction[] = [];

  constructor(private target: HTMLElement | Window = window) {}

  attach(): void {
    const t = this.target as Window;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    void t;
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat || e.ctrlKey || e.metaKey || (e.target instanceof HTMLElement && e.target.closest('input,select,textarea'))) return;
    const code = e.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      e.preventDefault();
      this.pressedEdge = true;
      this.heldState = true;
    } else if (code === 'Escape' || code === 'KeyP') {
      this.actionQueue.push('pause');
    } else if (code === 'KeyR') {
      this.actionQueue.push('restart');
    } else if (code === 'KeyZ') {
      this.actionQueue.push('checkpoint');
    } else if (code === 'Delete' || code === 'Backspace') {
      this.actionQueue.push('delete');
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const code = e.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      this.heldState = false;
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    // Only treat primary button as the jump action when not on a UI control.
    if (!e.isPrimary || e.button !== 0) return;
    if ((e.target as HTMLElement)?.closest?.('.ui-layer')) return;
    this.pressedEdge = true;
    this.heldState = true;
  };

  private onPointerUp = (): void => {
    this.heldState = false;
  };

  /** Called once per frame to commit the current state and clear edges. */
  poll(): InputFrame {
    this.pressed = this.pressedEdge;
    this.held = this.heldState;
    this.pressedEdge = false;
    return { pressed: this.pressed, held: this.held };
  }

  /** Pop a queued one-shot action, if any. */
  nextAction(): InputAction | null {
    return this.actionQueue.shift() ?? null;
  }

  clear(): void {
    this.pressedEdge = false;
    this.heldState = false;
    this.pressed = false;
    this.held = false;
    this.actionQueue.length = 0;
  }
}
