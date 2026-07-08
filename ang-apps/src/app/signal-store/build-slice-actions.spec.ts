import { TestBed } from '@angular/core/testing';
import { setupStore, storeState, resetStore, patchState, TestStore, TestActions } from '../../testing/store-testing';

describe('buildAllActions — store integration', () => {
  let store: TestStore;
  let actions: TestActions;

  beforeEach(() => {
    ({ store, actions } = setupStore());
  });

  // ── Counter slice ──────────────────────────────────────────────────────────

  describe('counter actions', () => {
    it('starts at initial state', () => {
      expect(storeState(store).counter).toEqual({ count: 0, step: 1 });
    });

    it('increment increases count by step', () => {
      actions.counter.increment();
      expect(storeState(store).counter.count).toBe(1);
    });

    it('decrement decreases count by step', () => {
      actions.counter.decrement();
      expect(storeState(store).counter.count).toBe(-1);
    });

    it('setStep then increment uses the new step', () => {
      actions.counter.setStep(5);
      actions.counter.increment();
      expect(storeState(store).counter.count).toBe(5);
    });

    it('reset returns to initial state after changes', () => {
      actions.counter.increment();
      actions.counter.setStep(10);
      actions.counter.reset();
      expect(storeState(store).counter).toEqual({ count: 0, step: 1 });
    });

    it('multiple increments accumulate', () => {
      actions.counter.increment();
      actions.counter.increment();
      actions.counter.increment();
      expect(storeState(store).counter.count).toBe(3);
    });
  });

  // ── Todos slice ────────────────────────────────────────────────────────────

  describe('todos actions', () => {
    it('starts with no items', () => {
      expect(storeState(store).todos.items).toHaveSize(0);
    });

    it('addTodo appends an item', () => {
      actions.todos.addTodo('Buy milk');
      expect(storeState(store).todos.items).toHaveSize(1);
      expect(storeState(store).todos.items[0].text).toBe('Buy milk');
    });

    it('toggleTodo flips done state', () => {
      actions.todos.addTodo('Buy milk');
      const id = storeState(store).todos.items[0].id;
      actions.todos.toggleTodo(id);
      expect(storeState(store).todos.items[0].done).toBeTrue();
      actions.todos.toggleTodo(id);
      expect(storeState(store).todos.items[0].done).toBeFalse();
    });

    it('removeTodo deletes by id', () => {
      actions.todos.addTodo('a');
      actions.todos.addTodo('b');
      const id = storeState(store).todos.items[0].id;
      actions.todos.removeTodo(id);
      expect(storeState(store).todos.items).toHaveSize(1);
      expect(storeState(store).todos.items[0].text).toBe('b');
    });

    it('clearDone removes only completed items', () => {
      actions.todos.addTodo('keep');
      actions.todos.addTodo('remove');
      const removeId = storeState(store).todos.items[1].id;
      actions.todos.toggleTodo(removeId);
      actions.todos.clearDone();
      expect(storeState(store).todos.items).toHaveSize(1);
      expect(storeState(store).todos.items[0].text).toBe('keep');
    });
  });

  // ── Slice isolation ────────────────────────────────────────────────────────

  describe('slice isolation', () => {
    it('counter actions do not affect todos state', () => {
      actions.todos.addTodo('stays here');
      actions.counter.increment();
      actions.counter.setStep(99);
      expect(storeState(store).todos.items).toHaveSize(1);
    });

    it('todos actions do not affect counter state', () => {
      actions.counter.setStep(7);
      actions.todos.addTodo('x');
      actions.todos.clearDone();
      expect(storeState(store).counter.step).toBe(7);
    });

    it('both slices are visible in a single state snapshot', () => {
      actions.counter.setStep(3);
      actions.todos.addTodo('hello');
      const s = storeState(store);
      expect(s.counter.step).toBe(3);
      expect(s.todos.items[0].text).toBe('hello');
    });
  });

  // ── patchState escape hatch for test setup ─────────────────────────────────

  describe('patchState for arbitrary test state', () => {
    it('allows setting counter state directly', () => {
      patchState(store, { counter: { count: 42, step: 5 } });
      expect(storeState(store).counter.count).toBe(42);
    });

    it('resetStore restores all slices to initial values', () => {
      actions.counter.increment();
      actions.todos.addTodo('x');
      resetStore(store);
      expect(storeState(store).counter.count).toBe(0);
      expect(storeState(store).todos.items).toHaveSize(0);
    });
  });
});
