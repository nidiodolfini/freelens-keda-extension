// @vitest-environment jsdom

import { Renderer } from "@freelensapp/extensions";
import { act, cleanup, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AvailableVersionPageProps, createAvailableVersionPage } from "./available-version";

// A minimal stub extension - only `name` is read by the pages below.
const extension = { name: "example-extension" } as Renderer.LensExtension;

// The stub's `apiManager.getStore()` returns undefined, as the host's does for
// an apiBase the cluster does not serve. A test marks a version as served by
// spying on it.
class ExampleV1alpha2 extends Renderer.K8sApi.KubeObject {
  static readonly apiBase = "/apis/example/v1alpha2/examples";
}
class ExampleV1alpha1 extends Renderer.K8sApi.KubeObject {
  static readonly apiBase = "/apis/example/v1alpha1/examples";
}

function serve() {
  vi.spyOn(Renderer.K8sApi.apiManager, "getStore").mockReturnValue({} as Renderer.K8sApi.KubeObjectStore);
}

const ExamplesPage = createAvailableVersionPage<AvailableVersionPageProps>("Examples", [
  {
    kubeObjectClass: ExampleV1alpha2,
    PageComponent: ({ extension }) => <span>v1alpha2 page of {extension.name}</span>,
    version: "v1alpha2",
  },
  {
    kubeObjectClass: ExampleV1alpha1,
    PageComponent: ({ extension }) => <span>v1alpha1 page of {extension.name}</span>,
    version: "v1alpha1",
  },
]);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("createAvailableVersionPage", () => {
  it("renders the first version that has a store, with the extension", () => {
    serve();

    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("v1alpha2 page of example-extension")).toBeDefined();
    expect(screen.queryByText(/v1alpha1 page/)).toBeNull();
  });

  it("falls back to a later version when an earlier one has no store", () => {
    const getStore = vi.spyOn(Renderer.K8sApi.apiManager, "getStore");
    getStore.mockImplementation((apiBase) =>
      apiBase === "/apis/example/v1alpha1/examples" ? ({} as Renderer.K8sApi.KubeObjectStore) : undefined,
    );

    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("v1alpha1 page of example-extension")).toBeDefined();
  });

  it("renders the not available page with the versions it tried when no version has a store", () => {
    vi.spyOn(Renderer.K8sApi.apiManager, "getStore").mockReturnValue(undefined);

    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("Examples Not Available")).toBeDefined();
    expect(screen.getByText("v1alpha2, v1alpha1")).toBeDefined();
  });

  it("renders the version's page once the host serves it after the first render", () => {
    // The host's `getStore()` reads its observable API registry. The spy reads an
    // observable in its place, so that serving the version is a change the page sees.
    const served = observable.box(false);
    vi.spyOn(Renderer.K8sApi.apiManager, "getStore").mockImplementation(() => {
      if (!served.get()) {
        return undefined;
      }
      return {} as Renderer.K8sApi.KubeObjectStore;
    });

    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("Examples Not Available")).toBeDefined();

    act(() => runInAction(() => served.set(true)));

    expect(screen.getByText("v1alpha2 page of example-extension")).toBeDefined();
    expect(screen.queryByText("Examples Not Available")).toBeNull();
  });
});
