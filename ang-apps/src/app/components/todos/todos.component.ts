import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { injectActions } from '../../actions';
import { injectState }   from '../../state';
import { type Todo }     from '../../signal-store/todos/todos.store';

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './todos.component.html',
})
export class TodosComponent {
  // ── Namespaced access ─────────────────────────────────────────────────────
  private actions = injectActions();
  private state   = injectState();

  // ── Pure state signal (from withState in todos.store.ts) ──────────────────
  readonly todos = this.state.todos.items;     // Signal<Todo[]>

  // ── Store-level computed signals (from withComputed in todos.store.ts) ────
  readonly completedCount = this.state.todos.completedCount;  // Signal<number>
  readonly pendingCount   = this.state.todos.pendingCount;    // Signal<number>
  readonly hasItems       = this.state.todos.hasItems;        // Signal<boolean>
  readonly hasDone        = this.state.todos.hasDone;         // Signal<boolean>
  readonly allDone        = this.state.todos.allDone;         // Signal<boolean>
  readonly progressLabel  = this.state.todos.progressLabel;   // Signal<string>

  // ── Component-level computed signals ──────────────────────────────────────
  // Derived locally — these don't belong in the shared store.
  readonly doneRatio = computed(() =>
    this.todos().length === 0 ? 0 : this.completedCount() / this.todos().length
  );
  readonly isEmpty = computed(() => !this.hasItems());

  // ── Component-local state ─────────────────────────────────────────────────
  readonly draft = signal('');

  // ── Marshaller — reads local signal before calling store method ───────────
  readonly addTodo = () => {
    const text = this.draft().trim();
    if (!text) return;
    this.actions.todos.addTodo(text);
    this.draft.set('');
  };

  // ── Simple handlers ───────────────────────────────────────────────────────
  readonly toggleTodo = (id: string) => this.actions.todos.toggleTodo(id);
  readonly removeTodo = (id: string) => this.actions.todos.removeTodo(id);
  readonly clearDone  = () => this.actions.todos.clearDone();

  // Template helpers
  trackById = (_: number, t: Todo) => t.id;
}
