/** An ordered horizontal broad phase for an auto-scrolling level. */
export class HorizontalIndex<T> {
  private sorted: T[] = [];

  constructor(private x: (item: T) => number) {}

  rebuild(items: T[]): void {
    this.sorted = items.slice().sort((a, b) => this.x(a) - this.x(b));
  }

  *range(left: number, right: number): Iterable<T> {
    let lo = 0, hi = this.sorted.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (this.x(this.sorted[mid]) < left) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < this.sorted.length && this.x(this.sorted[i]) <= right; i++) yield this.sorted[i];
  }
}
