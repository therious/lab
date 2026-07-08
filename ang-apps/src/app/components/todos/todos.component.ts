import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { injectActions } from '../../actions';
import { injectState }   from '../../state';
import { type Todo }     from '../../signal-store/todos/todos-slice';

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './todos.component.html',
})
export class TodosComponent {
  private actions = injectActions();
  private state   = injectState();

  // ── Pure state signal ─────────────────────────────────────────────────────
  readonly todos = this.state.todos.items;   // Signal<Todo[]>

  // ── Computed signals (local memoization — parallel to useMemo) ────────────
  readonly completedCount = computed(() => this.todos().filter(t => t.done).length);
  readonly pendingCount   = computed(() => this.todos().filter(t => !t.done).length);
  readonly hasItems       = computed(() => this.todos().length > 0);
  readonly hasDone        = computed(() => this.todos().some(t => t.done));
  readonly allDone        = computed(() => this.hasItems() && this.pendingCount() === 0);
  readonly progressLabel  = computed(() => `${this.completedCount()} / ${this.todos().length} done`);

  // ── Component-local state ─────────────────────────────────────────────────
  readonly draft = signal('');

  // ── Marshaller ────────────────────────────────────────────────────────────
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

  trackById = (_: number, t: Todo) => t.id;
}
