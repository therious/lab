# Angular Native Federation

Achieving micro-frontend goals with Angular 17.3.x using Native Federation — the
alternative to Webpack Module Federation that works with Angular's default esbuild
toolchain.

---

## What is Native Federation

"Native Federation" refers to the `@angular-architects/native-federation` library. It
solves the same problem as Webpack Module Federation (sharing code between independently
deployed apps at runtime) but does so using browser-native primitives instead of
Webpack's proprietary runtime:

- **Import Maps** — the browser standard that lets you remap bare module specifiers
  (`@angular/core`) to actual URLs at runtime
- **ES Modules** — native `import()` instead of Webpack's custom module loader

The practical consequence: it does not require Webpack at all, which means it works
with Angular's default esbuild-based builder that ships with Angular 17+. You do not
need to install or configure a custom Webpack setup.

The remote manifest is a `remoteEntry.json` file (not `.js`) — a plain JSON descriptor
listing what the remote exposes and where its chunks live.

---

## What is and is not possible with Angular 17.3.x

### Possible without upgrading

| Goal | Status |
|---|---|
| Single build that works standalone and as a remote | Supported |
| Same URL for direct access and as a remote entry | Supported — host references `remoteEntry.json` |
| Sharing `@angular/core` etc. between host and remote | Supported |
| Using the default esbuild builder (`application`) | Supported — this is the whole point |
| Lazy-loading a remote into a route | Supported |
| Remote taking over the full window in a shell | Supported |
| Running `ng serve` without Webpack | Supported |

### Limitations and known rough edges

**Import Map browser support.** Import Maps are supported in all modern browsers
(Chrome 89+, Firefox 108+, Safari 16.4+). If you need IE11 or older Safari you cannot
use Native Federation without a polyfill shim (`es-module-shims`), though Angular 17
itself already dropped IE11 support so this is unlikely to matter.

**Shared dependency version enforcement is weaker.** Webpack MF can enforce
`strictVersion` at runtime by throwing an error. Native Federation relies on Import Map
deduplication — if the host and remote each bundle their own copy of `@angular/core`
(because version ranges don't overlap), both load silently and you get two Angular
instances. You must be disciplined about keeping version ranges in sync.

**No `shareAll` shortcut by default.** The Native Federation schematic is more explicit
about what you share. `shareAll` is available but requires opt-in; the default
generated config lists packages individually.

**SSR / Angular Universal.** Native Federation is primarily a client-side technology.
Server-side rendering across federation boundaries requires additional coordination and
is not well-supported in the 17.x era.

---

## Setup — converting an existing Angular 17.3.x app

### 1. Install

```bash
ng add @angular-architects/native-federation@^17.0.0 --project <your-project> --type remote
```

The schematic:
- Installs `@angular-architects/native-federation`
- Updates `angular.json` to use the `@angular-architects/native-federation` builder
  (which wraps esbuild, not Webpack)
- Generates `federation.config.js`

### 2. The lazy bootstrap pattern

Same requirement as Webpack MF. `main.ts` must only contain a dynamic import:

```ts
// main.ts
import('./bootstrap').catch(err => console.error(err));
```

```ts
// bootstrap.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
```

### 3. Configure federation.config.js

```js
// federation.config.js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'myApp',
  exposes: {
    './Routes': './src/app/app.routes.ts',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
  skip: [
    // packages that must NOT be shared (e.g. zone.js)
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],
});
```

The output of a build includes `remoteEntry.json` alongside the normal `index.html`.

---

## Native Federation vs Webpack Module Federation — which to choose for 17.3.x

| Factor | Webpack MF | Native Federation |
|---|---|---|
| Toolchain required | Webpack (custom builder) | esbuild (Angular's default) |
| `ng serve` works out of the box | Only after builder swap | Yes, uses standard builder |
| `ng build` output | `remoteEntry.js` | `remoteEntry.json` + ES module chunks |
| Ecosystem maturity | Older, more examples/StackOverflow | Newer, fewer community examples |
| Version strictness at runtime | Hard errors possible | Soft — versions must be managed manually |
| Works with Angular CLI application builder | No | Yes |

**Recommendation for Angular 17.3.x:** Native Federation is the better choice because
Angular 17 defaulted to esbuild and the Webpack path requires swapping back to a custom
builder. If your app was created with `ng new` in Angular 17+, it is almost certainly
using the `application` builder and Native Federation will slot in without changing the
build toolchain.

---

## Shell application — minimal recipe

### 1. Set up the shell

```bash
ng new shell --routing --style css
ng add @angular-architects/native-federation@^17.0.0 --project shell --type host
```

### 2. Create a federation manifest (host side)

```json
// src/assets/federation.manifest.json
{
  "myApp": "https://your-remote.netlify.app/remoteEntry.json"
}
```

For local development:
```json
{
  "myApp": "http://localhost:4201/remoteEntry.json"
}
```

### 3. Initialize the manifest at startup

```ts
// shell/src/main.ts
import { initFederation } from '@angular-architects/native-federation';

initFederation('/assets/federation.manifest.json')
  .catch(err => console.error(err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error(err));
```

### 4a. Remote on a route

```ts
// shell/src/app/app.routes.ts
import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'app',
    loadChildren: () =>
      loadRemoteModule('myApp', './Routes').then(m => m.default),
  },
];
```

### 4b. Remote takes over the full window

```ts
export const routes: Routes = [
  {
    path: '**',
    loadChildren: () =>
      loadRemoteModule('myApp', './Routes').then(m => m.default),
  },
];
```

Shell `app.component.html` contains only `<router-outlet />`.

---

## Shared dependencies in standalone mode

Identical behaviour to Webpack MF: when the app runs standalone (no host), Import Maps
pointing at the remote's own chunks are used. The shared packages are bundled into the
remote's output. No special configuration is required.

---

## Troubleshooting

### `remoteEntry.json` 404 when running `ng serve`

The dev server may not serve the file until a full `ng build`. Check that the builder
in `angular.json` was updated by the schematic. Run `ng build` once to confirm the
output contains `remoteEntry.json`, then `ng serve` should also serve it.

### Two Angular instances at runtime (host + remote each load their own)

Version ranges in `federation.config.js` `shared` section do not overlap between host
and remote. Align the `@angular/*` versions (or use `requiredVersion: 'auto'` on both
sides) so the Import Map deduplication kicks in.

### `loadRemoteModule` call hangs or returns undefined

The remote name in `loadRemoteModule('myApp', ...)` must exactly match the key in
`federation.manifest.json` and the `name` field in the remote's `federation.config.js`.
