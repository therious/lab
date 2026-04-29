# Vite and Angular

The state of building Angular applications with Vite, what versions are required, and
how this intersects with micro-frontend strategies.

---

## Background — Angular's own build toolchain evolution

Angular has gone through three distinct build eras:

| Angular version | Default builder | Bundler |
|---|---|---|
| ≤ 15 | `@angular-devkit/build-angular:browser` | Webpack |
| 16–17 | `@angular-devkit/build-angular:application` | esbuild |
| 17+ (dev server) | `@angular-devkit/build-angular:dev-server` | esbuild + native ESM HMR |
| 18–19 | `@angular/build:application` (new package) | esbuild, with Vite as dev server |

Angular 18–19 is the inflection point: the new `@angular/build` package uses Vite
internally as the development server while still using esbuild for production bundles.
This is not the same as a full Vite build — esbuild produces the production output.

Angular does not officially support using Vite as the production bundler in place of
esbuild, and has no announced plans to do so. The community approach for full Vite
builds is the Analog framework.

---

## Option A — Analog (`@analogjs/vite-plugin-angular`)

[Analog](https://analogjs.org) is an Angular meta-framework (comparable to Next.js
for React) built on top of Vite. Its core piece is `@analogjs/vite-plugin-angular`,
which can be used standalone without the rest of Analog.

### What the plugin does

- Transforms Angular decorators (`@Component`, `@NgModule`, `@Injectable`, etc.) using
  the Angular compiler invoked through Babel and the Angular transform pipeline
- Inlines external template and style URLs at build time
- Provides HMR for Angular components under Vite's dev server
- Handles Zone.js loading order (Zone.js must load before Angular, which conflicts
  with Vite's default module ordering)

### Version compatibility matrix

| Angular | `@analogjs/vite-plugin-angular` | Vite |
|---|---|---|
| 17.x | `~1.0.x` | `^5.0` |
| 18.x | `~1.2.x` | `^5.2` |
| 19.x | `~1.4.x` or later | `^5.4` or `^6.0` |

These are approximate — always check the `peerDependencies` of the version you
install. The Analog project follows Angular's release cadence closely.

### Minimal Vite config for Angular 17.3.x

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import analog from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    analog({
      tsconfig: '<rootDir>/tsconfig.app.json',
    }),
  ],
  // Zone.js must be a side-effect import before Angular bootstraps
  optimizeDeps: {
    include: ['zone.js'],
  },
});
```

```ts
// main.ts — same lazy bootstrap pattern as Native Federation
import 'zone.js';
import('./bootstrap');
```

**Note:** when using the Vite plugin standalone (without the full Analog framework),
you are replacing the Angular CLI entirely. `ng serve` and `ng build` no longer apply.
Use `vite` and `vite build` instead.

### What you give up by leaving the Angular CLI

- Angular schematics (`ng generate`, `ng add`) still work but generate code that
  expects the CLI build pipeline. Some schematics (e.g. Angular Material) produce
  `angular.json` entries that don't apply to a Vite build.
- `ng test` uses Karma by default; you would switch to Vitest.
- Angular DevTools browser extension works but component tree hydration depends on
  the runtime, not the bundler — it should still function.

---

## Option B — Official Vite dev server (Angular 18+, esbuild production)

Angular 18 introduced an experimental Vite-backed dev server within the standard CLI:

```json
// angular.json (Angular 18+)
"serve": {
  "builder": "@angular/build:dev-server",
  ...
}
```

This gives you Vite's fast HMR and module graph during development while the
production `ng build` still uses esbuild. You do not install anything extra beyond
upgrading Angular.

**This option is not available in Angular 17.3.x.** The `@angular/build` package was
introduced in Angular 18 and is not backported.

---

## Upgrading Angular to unlock Vite support

Minimum versions and what each unlocks:

| Target version | What you get | Breaking changes to expect |
|---|---|---|
| 17.3.x (current) | esbuild default, no Vite | — |
| 18.x | Official Vite dev server (experimental) | `@angular/build` builder rename; some API changes |
| 19.x | Stable Vite dev server, zoneless experimental | Signal APIs stabilized; standalone default everywhere |

The 17→18 upgrade is generally low-risk for applications that are already using the
`application` builder. The 18→19 upgrade is similarly incremental. Both have official
migration guides and schematics (`ng update @angular/core @angular/cli`).

---

## Vite + Native Federation — the cleanest combination

If the goal is micro-frontends AND modern build tooling, combining Analog's Vite plugin
with `@angular-architects/native-federation` is feasible and is how Analog's own
federation support works.

The Native Federation build step runs after Vite's bundle, adding the `remoteEntry.json`
manifest. Because both tools work with standard ES modules and avoid Webpack, there are
no builder conflicts.

**Angular 17.3.x with this combination:**

```bash
# In the remote app
npm install @analogjs/vite-plugin-angular@~1.0
npm install @angular-architects/native-federation@^17.0.0
```

The `federation.config.js` is identical to the esbuild case (see `native-modules.md`).
The only change is that the build command becomes `vite build` followed by the NF
manifest generation step, rather than `ng build`.

This combination is less documented than the CLI-based path. Expect to debug
interaction issues between the Babel-based Angular transform and NF's chunk splitting.
The CLI-based Native Federation path (esbuild, no Vite) is more stable for 17.3.x.

---

## What requires an Angular upgrade

| Goal | Minimum version |
|---|---|
| Official Vite dev server (no third-party plugin) | Angular 18 |
| Zoneless Angular (no Zone.js) | Angular 18 experimental, Angular 19 stable |
| `@angular/build` package (replaces `@angular-devkit/build-angular`) | Angular 18 |
| Stable signal-based reactivity (no NgZone reliance) | Angular 19 |
| Full Vite production builds in the CLI (if/when shipped) | Not yet announced |

---

## Vitest for Angular

When replacing the Angular CLI build with Vite, the natural test runner replacement
is Vitest. `@analogjs/vite-plugin-angular` is the same plugin used in `vite.config.ts`
for tests:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import analog from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [analog()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['zone.js/testing'],
    include: ['src/**/*.spec.ts'],
  },
});
```

Angular 17.3.x with `@analogjs/vite-plugin-angular@~1.0` and `vitest@^1.x` is a
working combination. Upgrade to `vitest@^2.x` once on Angular 18+.
