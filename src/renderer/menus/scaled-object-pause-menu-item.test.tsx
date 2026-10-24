// @vitest-environment jsdom

import { Renderer } from "@freelensapp/extensions";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScaledObject, scaledObjectStore } from "../api/scaledobject/scaledobject-v1";
import { ScaledObjectPauseMenuItem } from "./scaled-object-pause-menu-item";

const PAUSED = "autoscaling.keda.sh/paused";
const PAUSED_REPLICAS = "autoscaling.keda.sh/paused-replicas";

const buildScaledObject = (annotations?: Record<string, string>) =>
  new ScaledObject({
    apiVersion: "keda.sh/v1alpha1",
    kind: "ScaledObject",
    metadata: {
      name: "example-app",
      namespace: "default",
      selfLink: "/apis/keda.sh/v1alpha1/namespaces/default/scaledobjects/example-app",
      annotations,
    },
    spec: { scaleTargetRef: { name: "example-app" }, triggers: [{ type: "cpu" }] },
  });

// The annotations the component sends to the store in its merge patch.
const patchedAnnotations = (patch: ReturnType<typeof vi.spyOn>) => {
  expect(patch).toHaveBeenCalledTimes(1);
  const [, body, strategy] = patch.mock.calls[0];
  expect(strategy).toBe("merge");
  return (body as { metadata: { annotations: Record<string, string | null> } }).metadata.annotations;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ScaledObjectPauseMenuItem", () => {
  describe("for an object that is not paused", () => {
    it("offers to pause and to scale to zero, not to resume", () => {
      render(<ScaledObjectPauseMenuItem object={buildScaledObject()} />);

      expect(screen.getByText("Pause Autoscaling")).toBeDefined();
      expect(screen.getByText("Scale to Zero")).toBeDefined();
      expect(screen.queryByText("Resume Autoscaling")).toBeNull();
    });

    it("pauses at the current replica count with the paused annotation", () => {
      const patch = vi.spyOn(scaledObjectStore, "patch");
      const object = buildScaledObject();
      render(<ScaledObjectPauseMenuItem object={object} />);

      fireEvent.click(screen.getByText("Pause Autoscaling"));

      expect(patch.mock.calls[0][0]).toBe(object);
      expect(patchedAnnotations(patch)).toEqual({ [PAUSED]: "true" });
    });

    it("asks for confirmation before scaling to zero, and writes paused-replicas 0 on ok", () => {
      const patch = vi.spyOn(scaledObjectStore, "patch");
      const open = vi.spyOn(Renderer.Component.ConfirmDialog, "open");
      render(<ScaledObjectPauseMenuItem object={buildScaledObject()} />);

      fireEvent.click(screen.getByText("Scale to Zero"));

      expect(patch).not.toHaveBeenCalled();
      expect(open).toHaveBeenCalledTimes(1);

      open.mock.calls[0][0].ok?.();

      expect(patchedAnnotations(patch)).toEqual({ [PAUSED_REPLICAS]: "0" });
    });
  });

  describe("for a paused object", () => {
    it("offers only to resume when paused at the current replica count", () => {
      render(<ScaledObjectPauseMenuItem object={buildScaledObject({ [PAUSED]: "true" })} />);

      expect(screen.getByText("Resume Autoscaling")).toBeDefined();
      expect(screen.queryByText("Pause Autoscaling")).toBeNull();
      expect(screen.queryByText("Scale to Zero")).toBeNull();
    });

    it("offers only to resume when scaled to zero", () => {
      render(<ScaledObjectPauseMenuItem object={buildScaledObject({ [PAUSED_REPLICAS]: "0" })} />);

      expect(screen.getByText("Resume Autoscaling")).toBeDefined();
      expect(screen.queryByText("Pause Autoscaling")).toBeNull();
      expect(screen.queryByText("Scale to Zero")).toBeNull();
    });

    it("resumes by removing both annotations in the merge patch", () => {
      const patch = vi.spyOn(scaledObjectStore, "patch");
      render(<ScaledObjectPauseMenuItem object={buildScaledObject({ [PAUSED_REPLICAS]: "0" })} />);

      fireEvent.click(screen.getByText("Resume Autoscaling"));

      expect(patchedAnnotations(patch)).toEqual({ [PAUSED]: null, [PAUSED_REPLICAS]: null });
    });
  });

  it("renders nothing without an object", () => {
    const { container } = render(<ScaledObjectPauseMenuItem object={undefined as unknown as ScaledObject} />);

    expect(container.textContent).toBe("");
  });
});
