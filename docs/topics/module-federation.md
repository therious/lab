# Angular Module Federation

Converting an Angular 17.3.x app to act as both a federated remote module and a
standalone deployable web application.

---

## Goals and feasibility

**The goal:** a single deployed build that can be opened directly as a web app *and*
consumed as a micro-frontend by a host application, both from the same URL.

**This is attainable.** Module Federation adds a second entry point — `remoteEntry.js`
— alongside the normal `main.js`. A deployed app therefore serves two purposes from the
same origin:

| Usage | Entry point | What happens |
|---|---|---|
| Direct browser visit | `index.html` → `main.js` | Angular bootstraps normally |
| Host app references it | `remoteEntry.js` | Host loads exposed module via Webpack MF |

No duplicate deploys are needed. The same Netlify/Vercel URL works for both.

---

## Core setup — converting an existing Angular 17.3.x app

### 1. Install the library

```bash
ng add @angular-architects/module-federation@^17.0.0 --project <your-project> --type remote
```

The schematic does three things:
- Installs `@angular-architects/module-federation`
- Generates `webpack.config.js` with `ModuleFederationPlugin` pre-configured
- Updates `angular.json` to use the custom webpack builder

Verify the builder in `angular.json` was set:
```json
"build": {
  "builder": "@angular-architects/module-federation/webpack",
  "options": {
    "customWebpackConfig": { "path": "webpack.config.js" }
  }
},
"serve": {
  "builder": "@angular-architects/module-federation/webpack-server",
  ...
}
```

If you ran the schematic manually or it partially applied, check this is present before
debugging anything else.

### 2. Split main.ts into a lazy bootstrap

Module Federation requires that Angular's bootstrap is deferred so the MF runtime can
set up shared dependencies before any module code runs. Without this, shared singletons
(e.g. `@angular/core`) are not deduplicated correctly.

**Before:**
```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
bootstrapApplication(AppComponent, appConfig);
```

**After:**
```ts
// main.ts — only a dynamic import, nothing else
import('./bootstrap').catch(err => console.error(err));
```

```ts
// bootstrap.ts — move the real bootstrap here
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
```

This pattern is mandatory. It is the single most common cause of "something is missing"
errors when first running `ng serve` after adding MF.

### 3. Configure webpack.config.js

A minimal remote config that exposes the whole application via its routes:

```js
// webpack.config.js
const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  name: 'myApp',               // must be a valid JS identifier, used by the host
  filename: 'remoteEntry.js',  // the URL fragment the host references
  exposes: {
    // Key is the name hosts use; value is the file to expose.
    // Exposing the routes file gives the host the full routing tree.
    './Routes': './src/app/app.routes.ts',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

`shareAll` marks all packages in `package.json` as shared. It is the safest default
for getting things working. You can narrow this later.

---

## Shared dependencies — how they work in each context

### When loaded by a host
The host and remote negotiate at runtime: if the host already has `@angular/core@17.x`
loaded and the remote's declared `requiredVersion` is satisfied, the remote reuses it.
Nothing extra is bundled. This is the whole point of `singleton: true`.

### When running as a standalone app
There is no host to provide shared packages, so Webpack bundles them into the remote's
own chunks. The final build contains everything needed to run standalone. No special
configuration is needed for this — it happens automatically.

### Opting out of sharing (intermediate step)
If you want to skip the sharing complexity entirely while getting things working, remove
the `shared` key from `webpack.config.js`. Each deployment becomes fully self-contained.
Downside: if the host and remote both load Angular, the user downloads it twice. Fine
for a prototype, not for production.

---

## Troubleshooting `ng serve`

### Error: "something is missing" / module not found at startup

**Most likely cause:** `main.ts` is not using the lazy bootstrap pattern (see §2 above).

Confirm `main.ts` contains *only* `import('./bootstrap')` and nothing else.

### Error: cannot find builder `@angular-architects/module-federation/webpack`

The schematic did not update `angular.json`. Apply the builder change from §1 manually.

### Error: `webpack.config.js` not found

Check that `angular.json` `customWebpackConfig.path` matches the actual filename and
location. It must be relative to the project root (where `angular.json` lives).

### Error: exposed module path does not exist

`exposes: { './Routes': './src/app/app.routes.ts' }` — that file must exist. If you are
using an `AppModule` based app (not standalone):

```js
exposes: {
  './Module': './src/app/app.module.ts',
},
```

### Version mismatch between `@angular-architects/module-federation` and Angular

| Angular version | MF package version |
|---|---|
| 17.x | `^17.0.0` |
| 16.x | `^16.0.0` |
| 15.x | `^15.0.0` |

Running `ng add` with the wrong version is the most common cause of builder resolution
failures.

### `strictVersion: true` causes runtime error in standalone mode

If you see a version negotiation error when running the app standalone (no host), set
`strictVersion: false` for the affected package, or use `requiredVersion: 'auto'`
which reads the version from `package.json` at build time.

---

## Shell application — minimal recipe

A shell is a host Angular app whose only job is to load and display the remote.

### 1. Create or designate the shell app

```bash
ng new shell --routing --style css
ng add @angular-architects/module-federation@^17.0.0 --project shell --type host
```

### 2. Declare the remote in webpack.config.js

```js
// shell/webpack.config.js
const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  remotes: {
    // Left side: the name you use in loadRemoteModule calls
    // Right side: MF name@URL/remoteEntry.js
    myApp: 'myApp@https://your-remote.netlify.app/remoteEntry.js',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

For local development replace the URL with `http://localhost:4201/remoteEntry.js`
(run the remote with `ng serve --port 4201`).

### 3a. Remote takes over a route

```ts
// shell/src/app/app.routes.ts
import { loadRemoteModule } from '@angular-architects/module-federation';
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'app',
    loadChildren: () =>
      loadRemoteModule({
        type: 'manifest',  // or 'module' if not using a manifest file
        remoteName: 'myApp',
        exposedModule: './Routes',
      }).then(m => m.default),  // app.routes.ts should export routes as default
  },
];
```

### 3b. Remote takes over the entire window

Use a wildcard route as the only entry in the shell's router. The shell becomes
invisible infrastructure — the user only ever sees the remote app:

```ts
export const routes: Routes = [
  {
    path: '**',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'https://your-remote.netlify.app/remoteEntry.js',
        exposedModule: './Routes',
      }).then(m => m.default),
  },
];
```

The shell's `app.component.html` should contain only `<router-outlet />`.

### 4. Type declarations (optional but avoids TS errors)

```ts
// shell/src/decl.d.ts
declare module 'myApp/Routes';
```

---

## Summary

| Question | Answer |
|---|---|
| Single build for both uses? | Yes — `main.js` for standalone, `remoteEntry.js` for host consumption |
| Same URL for both? | Yes — host references `https://your-app.com/remoteEntry.js` |
| Shared deps in standalone mode? | Automatically bundled; no extra config needed |
| Two separate deliverables needed? | No, but two separate *apps* (remote + shell) are still needed |
