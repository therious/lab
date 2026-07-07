import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CounterComponent } from './components/counter/counter.component';
import { TodosComponent }   from './components/todos/todos.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CounterComponent, TodosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>NgRx Signal Store — React-Like Pattern</h1>
    <app-counter />
    <app-todos />
  `,
})
export class AppComponent {}
