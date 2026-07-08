import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectActions } from '../../actions';
import { injectState }   from '../../state';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './counter.component.html',
})
export class CounterComponent {
  // ── Namespaced access — no store or NgRx imports in this file ─────────────
  private actions = injectActions();
  private state   = injectState();
  private ca      = this.actions.counter;

  // ── Pure state signals — direct reads from the store (parallel to useSelector)
  readonly count = this.state.counter.count;   // Signal<number>
  readonly step  = this.state.counter.step;    // Signal<number>

  // ── Computed signals — local memoization (parallel to useMemo in React)
  // These derive from store signals but live in the component, not the store.
  readonly isZero    = computed(() => this.count() === 0);
  readonly isNeg     = computed(() => this.count() < 0);
  readonly doubled   = computed(() => this.count() * 2);
  readonly stepLabel = computed(() => `step = ${this.step()}`);
  readonly summary   = computed(() => `${this.count()} · ×2 = ${this.doubled()}`);

  // ── Component-local state (signal() — never goes to the store) ────────────
  readonly customStep = signal(5);

  // ── Handlers ──────────────────────────────────────────────────────────────
  readonly increment   = () => this.ca.increment();
  readonly decrement   = () => this.ca.decrement();
  readonly reset       = () => this.ca.reset();
  readonly applyCustom = () => this.ca.setStep(this.customStep());
  readonly nudgeCustom = (delta: number) => this.customStep.update(n => Math.max(1, n + delta));
}
