import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { injectActions } from '../../actions';
import { injectState }   from '../../state';
import { type Todo }     from '../../signal-store/todos-slice';

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

  // ── Raw state signal ──────────────────────────────────────────────────────
  readonly todos = this.state.todos.items;

  // ── Slice-computed signals (from todosSlice.computed, shared singleton) ───
  readonly completedCount = this.state.todos.completedCount;
  readonly pendingCount   = this.state.todos.pendingCount;
  readonly hasItems       = this.state.todos.hasItems;
  readonly hasDone        = this.state.todos.hasDone;
  readonly allDone        = this.state.todos.allDone;
  readonly progressLabel  = this.state.todos.progressLabel;

  // ── Component-local derived signals ───────────────────────────────────────
  // doneRatio and isEmpty are specific to this component's display logic
  readonly doneRatio = computed(() =>
    this.todos().length === 0 ? 0 : this.completedCount() / this.todos().length
  );
  readonly isEmpty = computed(() => !this.hasItems());

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
