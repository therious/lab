import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';
import { setupStore, storeState, resetStore, patchState, TestStore } from '../../../testing/store-testing';

describe('CounterComponent', () => {
  let fixture:   ComponentFixture<CounterComponent>;
  let component: CounterComponent;
  let element:   HTMLElement;
  let store:     TestStore;

  beforeEach(async () => {
    ({ store } = setupStore());
    await TestBed.configureTestingModule({ imports: [CounterComponent] }).compileComponents();
    fixture   = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    element   = fixture.nativeElement;
    fixture.detectChanges();
  });

  // ── Signal reads ───────────────────────────────────────────────────────────

  it('count signal starts at 0', () => {
    expect(component.count()).toBe(0);
  });

  it('step signal starts at 1', () => {
    expect(component.step()).toBe(1);
  });

  it('isZero is true at start', () => {
    expect(component.isZero()).toBeTrue();
  });

  it('doubled starts at 0', () => {
    expect(component.doubled()).toBe(0);
  });

  // ── Computed signals update when store changes ─────────────────────────────

  it('isZero becomes false after increment', () => {
    component.increment();
    fixture.detectChanges();
    expect(component.isZero()).toBeFalse();
  });

  it('isNeg becomes true after decrement from zero', () => {
    component.decrement();
    fixture.detectChanges();
    expect(component.isNeg()).toBeTrue();
  });

  it('doubled tracks count × 2', () => {
    patchState(store, { counter: { count: 7, step: 1 } });
    fixture.detectChanges();
    expect(component.doubled()).toBe(14);
  });

  it('summary reflects current count', () => {
    patchState(store, { counter: { count: 5, step: 1 } });
    fixture.detectChanges();
    expect(component.summary()).toContain('5');
    expect(component.summary()).toContain('10');
  });

  // ── Action handlers ────────────────────────────────────────────────────────

  it('increment updates the store', () => {
    component.increment();
    expect(storeState(store).counter.count).toBe(1);
  });

  it('decrement updates the store', () => {
    component.decrement();
    expect(storeState(store).counter.count).toBe(-1);
  });

  it('reset returns count to 0', () => {
    component.increment();
    component.increment();
    component.reset();
    expect(storeState(store).counter.count).toBe(0);
  });

  it('reset is disabled in the DOM when count is 0', () => {
    const btn = element.querySelector<HTMLButtonElement>('button[disabled]');
    expect(btn?.textContent?.trim()).toBe('Reset');
  });

  it('reset button becomes enabled after increment', () => {
    component.increment();
    fixture.detectChanges();
    const disabled = element.querySelectorAll<HTMLButtonElement>('button[disabled]');
    expect(Array.from(disabled).some(b => b.textContent?.includes('Reset'))).toBeFalse();
  });

  // ── DOM rendering ──────────────────────────────────────────────────────────

  it('renders the count value in the DOM', () => {
    patchState(store, { counter: { count: 42, step: 1 } });
    fixture.detectChanges();
    expect(element.textContent).toContain('42');
  });

  it('renders the step label', () => {
    patchState(store, { counter: { count: 0, step: 3 } });
    fixture.detectChanges();
    expect(element.textContent).toContain('step = 3');
  });

  it('shows the negative warning only when count is negative', () => {
    expect(element.textContent).not.toContain('negative');
    component.decrement();
    fixture.detectChanges();
    expect(element.textContent).toContain('negative');
  });

  // ── Local signal (customStep) ──────────────────────────────────────────────

  it('customStep starts at 5 and is component-local', () => {
    expect(component.customStep()).toBe(5);
    expect(storeState(store).counter.step).toBe(1); // store unaffected
  });

  it('nudgeCustom increments customStep by delta', () => {
    component.nudgeCustom(3);
    expect(component.customStep()).toBe(8);
  });

  it('applyCustom updates the store step', () => {
    component.nudgeCustom(2); // customStep → 7
    component.applyCustom();
    expect(storeState(store).counter.step).toBe(7);
  });
});
