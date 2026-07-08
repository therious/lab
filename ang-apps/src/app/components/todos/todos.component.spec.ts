import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodosComponent } from './todos.component';
import { injectStore, storeState, patchState, TestStore } from '../../../testing/store-testing';
import { TodosState } from '../../signal-store/todos-slice';

describe('TodosComponent', () => {
  let fixture:   ComponentFixture<TodosComponent>;
  let component: TodosComponent;
  let element:   HTMLElement;
  let store:     TestStore;

  const withItems = (items: TodosState['items']): void =>
    patchState(store, { todos: { items } });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TodosComponent] }).compileComponents();
    ({ store } = injectStore());
    fixture   = TestBed.createComponent(TodosComponent);
    component = fixture.componentInstance;
    element   = fixture.nativeElement;
    fixture.detectChanges();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with no todos', () => {
    expect(component.todos()).toHaveSize(0);
  });

  it('isEmpty is true at start', () => {
    expect(component.isEmpty()).toBeTrue();
  });

  it('hasItems is false at start', () => {
    expect(component.hasItems()).toBeFalse();
  });

  // ── Computed signals ───────────────────────────────────────────────────────

  it('completedCount reflects done items', () => {
    withItems([
      { id: '1', text: 'a', done: true },
      { id: '2', text: 'b', done: false },
    ]);
    fixture.detectChanges();
    expect(component.completedCount()).toBe(1);
  });

  it('pendingCount reflects undone items', () => {
    withItems([
      { id: '1', text: 'a', done: true },
      { id: '2', text: 'b', done: false },
    ]);
    fixture.detectChanges();
    expect(component.pendingCount()).toBe(1);
  });

  it('allDone is true only when all items are done', () => {
    withItems([{ id: '1', text: 'a', done: true }]);
    fixture.detectChanges();
    expect(component.allDone()).toBeTrue();
  });

  it('allDone is false when any item is pending', () => {
    withItems([
      { id: '1', text: 'a', done: true },
      { id: '2', text: 'b', done: false },
    ]);
    fixture.detectChanges();
    expect(component.allDone()).toBeFalse();
  });

  it('doneRatio is 0 when no items', () => {
    expect(component.doneRatio()).toBe(0);
  });

  it('doneRatio is 0.5 when half done', () => {
    withItems([
      { id: '1', text: 'a', done: true },
      { id: '2', text: 'b', done: false },
    ]);
    fixture.detectChanges();
    expect(component.doneRatio()).toBe(0.5);
  });

  it('progressLabel shows done/total', () => {
    withItems([
      { id: '1', text: 'a', done: true },
      { id: '2', text: 'b', done: false },
    ]);
    fixture.detectChanges();
    expect(component.progressLabel()).toBe('1 / 2 done');
  });

  // ── Action handlers ────────────────────────────────────────────────────────

  it('addTodo adds an item to the store', () => {
    component.draft.set('Buy milk');
    component.addTodo();
    expect(storeState(store).todos.items).toHaveSize(1);
    expect(storeState(store).todos.items[0].text).toBe('Buy milk');
  });

  it('addTodo clears the draft', () => {
    component.draft.set('Buy milk');
    component.addTodo();
    expect(component.draft()).toBe('');
  });

  it('addTodo does nothing if draft is empty or whitespace', () => {
    component.draft.set('   ');
    component.addTodo();
    expect(storeState(store).todos.items).toHaveSize(0);
  });

  it('toggleTodo flips an item', () => {
    withItems([{ id: '1', text: 'a', done: false }]);
    component.toggleTodo('1');
    expect(storeState(store).todos.items[0].done).toBeTrue();
  });

  it('removeTodo deletes an item', () => {
    withItems([{ id: '1', text: 'a', done: false }]);
    component.removeTodo('1');
    expect(storeState(store).todos.items).toHaveSize(0);
  });

  it('clearDone removes completed items only', () => {
    withItems([
      { id: '1', text: 'keep',   done: false },
      { id: '2', text: 'remove', done: true  },
    ]);
    component.clearDone();
    expect(storeState(store).todos.items).toHaveSize(1);
    expect(storeState(store).todos.items[0].text).toBe('keep');
  });

  // ── DOM rendering ──────────────────────────────────────────────────────────

  it('renders each todo item in the DOM', () => {
    withItems([
      { id: '1', text: 'Buy milk', done: false },
      { id: '2', text: 'Walk dog', done: false },
    ]);
    fixture.detectChanges();
    const items = element.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Buy milk');
    expect(items[1].textContent).toContain('Walk dog');
  });

  it('shows progress label when items exist', () => {
    withItems([{ id: '1', text: 'a', done: true }]);
    fixture.detectChanges();
    expect(element.textContent).toContain('1 / 1 done');
  });

  it('shows All done message when all items are complete', () => {
    withItems([{ id: '1', text: 'a', done: true }]);
    fixture.detectChanges();
    expect(element.textContent).toContain('All done');
  });

  it('shows clear-done button only when there are done items', () => {
    withItems([{ id: '1', text: 'a', done: false }]);
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Clear done');

    withItems([{ id: '1', text: 'a', done: true }]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Clear done');
  });

  it('Add button is disabled when draft is empty', () => {
    const btn = Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => b.textContent?.trim() === 'Add');
    expect(btn?.disabled).toBeTrue();
  });
});
