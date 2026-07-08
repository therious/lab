import { inject }            from '@angular/core';
import { AppStore }          from './signal-store/app.store';
import { allSlices }         from './signal-store/combined-slices';
import { buildAllActions }   from './signal-store/build-slice-actions';

/**
 * Returns the namespaced actions object, fully derived from allSlices.
 * Adding a slice to combined-slices.ts is all that's needed —
 * no code changes here.
 *
 *   const actions = injectActions()
 *   actions.counter.setStep(5)         // typed (step: number) => void
 *   actions.todos.addTodo('Buy milk')  // typed (text: string) => void
 */
export function injectActions() {
  return buildAllActions(allSlices, inject(AppStore));
}
