# freelens-keda-extension

A Freelens extension for [KEDA](https://keda.sh/) (Kubernetes Event-driven Autoscaling):
browse ScaledObjects with the same columns as `kubectl get so`, inspect every trigger in
the details panel, watch the object's scaling events, and pause or resume autoscaling from
the object menu.

Built for the Freelens **extension API v1** (Freelens 1.x, `engines.freelens: ^1.8.0`), with
the build layout of the official
[`freelensapp/freelens-fluxcd-extension`](https://github.com/freelensapp/freelens-fluxcd-extension)
v5.3.1 (electron-vite, CommonJS bundles in `out/`).

Repository: <https://github.com/nidiodolfini/freelens-keda-extension>.

## What the extension does

A **Scaled Objects** page, grouped under its own sidebar entry:

- Columns mirroring `kubectl get so`: Name, Namespace, Scale Target, Min, Max, Triggers,
  Status, Ready, Active, Fallback and Age.
- Status comes from the object's conditions and is rendered as a colored badge
  (`success` / `error` / `warning` / `info`) with the controller's reason
  (`ScaledObjectReady`, `ScaledObjectCheckFailed`, `Paused`, `Fallback`, `Active`, ...).
- When the CRD is not installed in the cluster, the page shows a friendly
  "Not Available" message.

Each ScaledObject also gets a details panel in the drawer:

- Scale target (`kind/name` + apiVersion), min/max replicas, polling interval, cooldown
  period, idle replica count, initial cooldown period, `advanced` options and fallback.
- **Triggers**: one section per scaler, with its type as a badge, its name, its metadata
  as key/value sub-items and its authentication ref.
- **Scaling Events**: the events the cluster records for the object (KEDA writes one per
  scaling decision), read from the host's core event store and shown as a table — Type,
  Reason, Message, Count and Last Seen — newest first, up to 20. The section is omitted
  when the event store is unavailable and shows "No events" when the object has none.
- Conditions with their messages as tooltips, external metric names, original replica
  count, last active time and the pause state.

**Pause / Resume Autoscaling**: the ScaledObject menu writes the
`autoscaling.keda.sh/paused-replicas` annotation — the same as
`kubectl annotate so <name> autoscaling.keda.sh/paused-replicas=0 --overwrite`. Pausing
scales the target down to the given replicas and freezes it there; resuming removes the
annotation (a `null` in the merge patch) so the controller scales normally again.

## Requirements

- Freelens 1.8 or newer (extension API v1; tested on 1.10.x).
- A cluster with KEDA installed (`keda.sh/v1alpha1`, KEDA 2.x).

## Installation

In Freelens, open **Extensions**, choose **Install** and type `freelens-keda-extension`
(no path). Freelens resolves the package from the npm registry, exactly like the official
extensions. Enable it, and the "Scaled Objects" sidebar entry appears on every cluster.

To install from a local checkout instead (for development), see
[Development](#development) below.

## Usage

1. Apply the example objects to a cluster with KEDA installed:

   ```powershell
   kubectl apply -f examples/keda/scaledobject-cron.yaml
   kubectl apply -f examples/keda/scaledobject-cpu.yaml
   ```

   Both scale the Deployment `example-app`: the cron ScaledObject wakes one replica
   between 00:30 and 00:45 (America/Sao_Paulo) and scales back to zero, and the CPU
   ScaledObject keeps between 1 and 5 replicas following CPU utilization at 50%.

2. Open the cluster in Freelens. The page lists `example-app-cron` and
   `example-app-cpu`; each details panel shows its triggers, and the "Scaling Events"
   section fills in as the controller reconciles.

3. Open the menu of a ScaledObject and click **Pause Autoscaling**; the Status column
   switches to `Paused` once the controller applies the annotation, and
   **Resume Autoscaling** restores normal scaling.

## Development

Node 22+ and pnpm are required.

```powershell
pnpm install
pnpm type:check     # tsc -p tsconfig.json (single program, as in the fluxcd extension)
pnpm test:unit      # vitest
pnpm build          # electron-vite build -> out/main and out/renderer (CommonJS)
pnpm biome:fix      # formatting/lint (TypeScript, TSX, JSON, CSS, HTML)
pnpm biome:check
pnpm knip:check     # unused files and dependencies (downloads knip via pnpm dlx)
pnpm pack:dev       # bump prerelease + build + .tgz to install in Freelens
pnpm clean          # remove out/
```

To load the checkout in Freelens, run `pnpm install && pnpm build`, then in **Extensions**
choose **Install from directory** and point at this directory; confirm loading the
extension "in place" so rebuilds reload it automatically.

### Development environment notes (this workspace)

The development machine runs inside a sandbox that blocks some standard tooling, so this
checkout carries a few workarounds; they are documented here because they differ from the
upstream template:

- `packageManager` is `pnpm@11.28.6`, vendored under the workspace's `.tools/` with a
  shim at `..\.tools\bin\pnpm.cmd` (add `..\.tools\bin` to `PATH`). pnpm 12 keeps its
  store lock in `%LOCALAPPDATA%`, which the sandbox blocks.
- pnpm 11 reads only auth/registry settings from `.npmrc`; every other setting
  lives in `pnpm-workspace.yaml`. Both files keep the pnpm store and cache
  inside the workspace: `storeDir: .pnpm-store`, `cacheDir: .pnpm-cache`,
  `nodeLinker: hoisted` and `autoInstallPeers: true` (the same values are
  mirrored in `.npmrc` for tooling that still reads it). `stateDir` cannot be
  set at project level in pnpm 11; the sandbox keeps the state inside the
  workspace by redirecting `LOCALAPPDATA`.
- The sandbox blocks spawning child processes with piped stdio, so the workspace's
  `..\.tools\patch-vite.mjs` applies three environment fixes after `pnpm install`: the
  `net use` realpath call of Vite (try/catch), the pure-JS `sass` compiler instead of
  `sass-embedded` (which spawns the Dart Sass binary), and in-process TypeScript
  transpilation of the electron-vite config instead of the esbuild service (which spawns
  a binary). Run it from this directory: `node ..\.tools\patch-vite.mjs`.
- The electron-vite config therefore does not use `@vitejs/plugin-react` (the config's
  CommonJS loader cannot `require()` the plugin's ESM graph with top-level `await`); JSX uses
  Vite's native automatic transform (`react/jsx-runtime` mapped to the host global). The
  plugin stays as a devDependency to mirror the fluxcd extension, and knip ignores it.
- `test:unit` uses `--pool=threads` and `knip:check` uses `&&` instead of the parallel
  regex script, both because of the same spawn restriction.
- `biome:*` and `knip:*` download via `pnpm dlx`, whose default cache lives in
  `%LOCALAPPDATA%`; set `$env:LOCALAPPDATA` to a workspace-local directory before running
  them on this machine.

## Project structure

```text
electron.vite.config.js                          # electron-vite config (main + renderer in preload)
build/global-externals.js                        # plugin: react/mobx/... -> host globals (v1)
src/
  main/index.ts                                  # main entry (stateless)
  renderer/index.tsx                             # v1 registrations: apiManager, page, details, menu
  renderer/api/types.ts                          # KEDA spec/status types
  renderer/api/scaledobject/scaledobject-v1.ts   # ScaledObject model (+ Api/Store, test)
  renderer/pages/                                # ScaledObjects page + CSS module
  renderer/details/                              # ScaledObject details panel (incl. Scaling Events)
  renderer/menus/                                # Pause/Resume Autoscaling (ScaledObject)
  renderer/icons/                                # KEDA logo (currentColor)
  renderer/components/                           # createAvailableVersionPage, error boundaries
examples/keda/                                   # test objects (kubectl apply -f)
```

Build output goes to `out/main/index.js` and `out/renderer/index.js` (CommonJS bundles, like
the other Freelens 1.x extensions); `package.json` points `main`/`renderer` at them.

## Supported API versions

The extension supports **`keda.sh/v1alpha1` only** (one version per kind, with the
"Not Available" page when the CRD is missing). To add another version later, follow the
same per-version model/page/details pattern and list both versions in
`createAvailableVersionPage`, newest first.

## Publishing a release

```powershell
pnpm bump-version patch        # or minor/major/prerelease
pnpm build
pnpm publish                   # requires npmjs.com authentication (NODE_AUTH_TOKEN)
```

The `.github/workflows/release.yaml` workflow also publishes automatically when a `v*` tag
is pushed (it needs the npm registry `NPM_TOKEN` secret in the GitHub repository, or npm
Trusted Publishing / provenance).

## License

MIT. The sidebar icon is the official KEDA logo
([`kedacore/keda` `images/logos/keda-icon-black.svg`](https://github.com/kedacore/keda/blob/main/images/logos/keda-icon-black.svg),
Apache-2.0), recolored with `currentColor` so it follows the Freelens theme.
