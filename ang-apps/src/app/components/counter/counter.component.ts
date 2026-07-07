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
  // ── Namespaced access — no store imports in this file ─────────────────────
  private actions = injectActions();
  private state   = injectState();
  private ca      = this.actions.counter;   // slice alias

  // ── Pure state signals (from withState in counter.store.ts) ───────────────
  // Direct window into the store's raw state — updates on every patchState().
  readonly count = this.state.counter.count;   // Signal<number>
  readonly step  = this.state.counter.step;    // Signal<number>

  // ── Store-level computed signals (from withComputed in counter.store.ts) ──
  // Defined once in the slice; any component can read them without re-computing.
  readonly doubled   = this.state.counter.doubled;    // Signal<number>
  readonly isZero    = this.state.counter.isZero;     // Signal<boolean>
  readonly stepLabel = this.state.counter.stepLabel;  // Signal<string>
  readonly summary   = this.state.counter.summary;    // Signal<string>

  // ── Component-level computed signals (computed() here, not in the store) ──
  // Purely local derivations; useful when the logic is component-specific.
  readonly isNeg  = computed(() => this.count() < 0);
  readonly bigNum = computed(() => Math.abs(this.count()) > 100);

  // ── Component-local state (signal(), never touches the store) ─────────────
  readonly customStep = signal(5);

  // ── Handlers ──────────────────────────────────────────────────────────────
  readonly increment   = () => this.ca.increment();
  readonly decrement   = () => this.ca.decrement();
  readonly reset       = () => this.ca.reset();
  readonly applyCustom = () => this.ca.setStep(this.customStep());
  readonly nudgeCustom = (delta: number) => this.customStep.update(n => Math.max(1, n + delta));
}
