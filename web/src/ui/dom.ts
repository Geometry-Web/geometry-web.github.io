// Minimal DOM helpers for the HTML/CSS UI overlay.

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') {
      el.className = v as string;
    } else if (k === 'style') {
      el.setAttribute('style', v as string);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'dataset') {
      Object.assign(el.dataset, v as Record<string, string>);
    } else if (v !== null && v !== undefined) {
      el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c == null) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  return h('button', { class: 'btn ' + cls, onclick: onClick }, label);
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function div(cls = '', ...children: (Node | string | null | undefined)[]): HTMLDivElement {
  return h('div', { class: cls }, ...children);
}
