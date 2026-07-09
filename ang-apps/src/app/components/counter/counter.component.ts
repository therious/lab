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
  private actions = injectActions();
  private state   = injectState();
  private ca      = this.actions.counter;

  // ── Raw state signals ─────────────────────────────────────────────────────
  readonly count = this.state.counter.count;

  // ── Slice-computed signals (from counterSlice.computed, shared singleton) ─
  readonly step      = this.state.counter.step;
  readonly doubled   = this.state.counter.doubled;
  readonly isZero    = this.state.counter.isZero;
  readonly isNeg     = this.state.counter.isNeg;
  readonly stepLabel = this.state.counter.stepLabel;
  readonly summary   = this.state.counter.summary;

  // ── Component-local state and derived signals ─────────────────────────────
  readonly customStep = signal(5);
  readonly bigNum     = computed(() => Math.abs(this.count()) > 100);

  // ── Handlers ──────────────────────────────────────────────────────────────
  readonly increment   = () => this.ca.increment();
  readonly decrement   = () => this.ca.decrement();
  readonly reset       = () => this.ca.reset();
  readonly applyCustom = () => this.ca.setStep(this.customStep());
  readonly nudgeCustom = (delta: number) => this.customStep.update(n => Math.max(1, n + delta));
}
