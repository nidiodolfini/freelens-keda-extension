// Minimal stub of `@freelensapp/extensions` for unit tests.
//
// The real package re-exports the Freelens host renderer bundle, which expects
// a browser environment and cannot be imported under the Node-based vitest
// runner. `vitest.config.ts` aliases the import to this file instead. The
// package ships no mocks of its own to use in its place.
//
// Only the surface the tests exercise is stubbed here, and only at runtime: the
// tests are type-checked against the real declaration of the package. Extend it
// as your tests need more of the host API.
import React from "react";
import { vi } from "vitest";

class KubeObject {
  apiVersion?: string;
  kind?: string;
  metadata?: { name?: string; namespace?: string; creationTimestamp?: string };
  spec?: unknown;
  status?: unknown;

  constructor(data: Record<string, unknown> = {}) {
    Object.assign(this, data);
  }

  // As the host's, from the metadata.
  getName() {
    return this.metadata?.name ?? "";
  }

  getNs() {
    return this.metadata?.namespace;
  }

  getCreationTimestamp() {
    return this.metadata?.creationTimestamp ? new Date(this.metadata.creationTimestamp).getTime() : 0;
  }
}

// As the host's: an api created from the model class, whose `apiBase` comes
// from the `objectConstructor` static.
class KubeApi {
  objectConstructor: unknown;
  apiBase: string | undefined;

  constructor(opts: { objectConstructor: typeof KubeObject & { apiBase?: string }; autoRegister?: boolean }) {
    this.objectConstructor = opts.objectConstructor;
    this.apiBase = opts.objectConstructor.apiBase;
  }
}

// As the host's store: keeps its items in an array and knows its api.
class KubeObjectStore {
  items: unknown[] = [];

  async patch(_item: unknown, _patch: unknown, _strategy?: unknown): Promise<unknown> {
    return undefined;
  }
}

const apiManager = {
  registerStore: vi.fn(),
  // Returns undefined, as the host's does for an apiBase the cluster does not
  // serve. Tests that need a store spy on this method (see the pages' tests).
  getStore: vi.fn(() => undefined),
};

// Host components, reduced to what the tests render. The pages reach them all
// when their renderTableContents runs.
function Badge({
  label,
  className,
  children,
  tooltip,
}: {
  label?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  tooltip?: React.ReactNode;
}) {
  return React.createElement("span", { className, title: tooltip }, label, children);
}

function BadgeBoolean({ value }: { value?: boolean }) {
  return React.createElement("span", null, value === undefined ? "-" : String(value));
}

function KubeObjectAge({ object }: { object: { metadata: { creationTimestamp?: string } } }) {
  return React.createElement("span", null, object.metadata.creationTimestamp ?? "-");
}

function LinkToNamespace({ namespace }: { namespace?: string }) {
  return React.createElement("span", null, namespace ?? "");
}

function WithTooltip({ children }: { children?: React.ReactNode; tooltip?: React.ReactNode }) {
  return React.createElement("span", null, children);
}

function Icon({ material, title, interactive }: { material?: string; title?: string; interactive?: boolean }) {
  return React.createElement("span", { title, "data-interactive": interactive }, material ?? "");
}

function MenuItem({ children, onClick }: { children?: React.ReactNode; onClick?: (event: unknown) => void }) {
  return React.createElement("div", { onClick }, children);
}

function DrawerItem({
  name,
  children,
  hidden,
  labelsOnly,
}: {
  name?: React.ReactNode;
  children?: React.ReactNode;
  hidden?: boolean;
  labelsOnly?: boolean;
}) {
  if (hidden) return null;
  return React.createElement("div", { "data-labels-only": labelsOnly }, name, children);
}

interface KubeObjectListLayoutProps {
  store: { items: unknown[] };
  renderTableContents: (item: unknown) => React.ReactNode[];
}

// Only the part of the host's list layout where it calls back into the
// extension: it calls `renderTableContents` for every item of the store from
// its own render, a child of the page, and renders the cells.
function KubeObjectListLayout({ store, renderTableContents }: KubeObjectListLayoutProps) {
  return React.createElement(
    "div",
    null,
    store.items.map((item, index) => React.createElement("div", { key: index }, ...renderTableContents(item))),
  );
}

// Only the `open` static the menu items call; tests spy on it and run the
// `ok` callback they are given.
const ConfirmDialog = {
  open: vi.fn(),
};

export const Renderer = {
  Component: {
    Badge,
    BadgeBoolean,
    ConfirmDialog,
    DrawerItem,
    Icon,
    KubeObjectAge,
    KubeObjectListLayout,
    LinkToNamespace,
    MenuItem,
    WithTooltip,
  },
  K8sApi: {
    KubeObject,
    KubeApi,
    KubeObjectStore,
    apiManager,
  },
};

export const Common = {
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};
