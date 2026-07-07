import { ApplicationConfig } from '@angular/core';

// SignalStore slices are self-registering via { providedIn: 'root' } —
// no provideStore() call needed.
export const appConfig: ApplicationConfig = {
  providers: [],
};
