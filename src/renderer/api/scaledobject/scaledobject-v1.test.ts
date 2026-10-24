import { describe, expect, it } from "vitest";
import { ScaledObject } from "./scaledobject-v1";

// `@freelensapp/extensions` is stubbed for tests (see `test/freelens-extensions.ts`),
// which lets us construct a real `ScaledObject` instance from plain resource data.
describe("ScaledObject (v1alpha1)", () => {
  const buildScaledObject = (spec: ScaledObject["spec"], status?: ScaledObject["status"]) =>
    new ScaledObject({
      apiVersion: "keda.sh/v1alpha1",
      kind: "ScaledObject",
      metadata: {
        name: "example-app",
        namespace: "default",
        selfLink: "/apis/keda.sh/v1alpha1/namespaces/default/scaledobjects/example-app",
      },
      spec,
      status,
    });

  describe("metadata", () => {
    it("is namespaced and serves keda.sh/v1alpha1", () => {
      expect(ScaledObject.kind).toBe("ScaledObject");
      expect(ScaledObject.namespaced).toBe(true);
      expect(ScaledObject.apiBase).toBe("/apis/keda.sh/v1alpha1/scaledobjects");
      expect(ScaledObject.crd.apiVersions).toEqual(["keda.sh/v1alpha1"]);
      expect(ScaledObject.crd.plural).toBe("scaledobjects");
      expect(ScaledObject.crd.shortNames).toEqual(["so"]);
    });
  });

  describe("getStatusText", () => {
    const spec = { scaleTargetRef: { name: "example-app" }, triggers: [{ type: "cpu" }] };

    it("returns the reason of a Ready condition with status False", () => {
      const object = buildScaledObject(spec, {
        conditions: [{ type: "Ready", status: "False", reason: "ScaledObjectCheckFailed" }],
      });
      expect(ScaledObject.getStatusText(object)).toBe("ScaledObjectCheckFailed");
    });

    it("defaults to Error for a False Ready condition without a reason", () => {
      const object = buildScaledObject(spec, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ScaledObject.getStatusText(object)).toBe("Error");
    });

    it("returns Ready for a Ready condition with status True", () => {
      const object = buildScaledObject(spec, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ScaledObject.getStatusText(object)).toBe("Ready");
    });

    it("returns Active for an Active condition with status True", () => {
      const object = buildScaledObject(spec, {
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Active", status: "True" },
        ],
      });
      expect(ScaledObject.getStatusText(object)).toBe("Active");
    });

    it("returns Fallback for a Fallback condition with status True", () => {
      const object = buildScaledObject(spec, {
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Fallback", status: "True" },
        ],
      });
      expect(ScaledObject.getStatusText(object)).toBe("Fallback");
    });

    it("returns Paused for a Paused condition with status True", () => {
      const object = buildScaledObject(spec, {
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Paused", status: "True" },
        ],
      });
      expect(ScaledObject.getStatusText(object)).toBe("Paused");
    });

    it("returns Unknown when there are no conditions", () => {
      expect(ScaledObject.getStatusText(buildScaledObject(spec))).toBe("Unknown");
    });
  });

  describe("getStatusClass", () => {
    const spec = { scaleTargetRef: { name: "example-app" }, triggers: [{ type: "cpu" }] };

    it("maps a False Ready condition to error", () => {
      const object = buildScaledObject(spec, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ScaledObject.getStatusClass(object)).toBe("error");
    });

    it("maps a True Ready condition to success", () => {
      const object = buildScaledObject(spec, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ScaledObject.getStatusClass(object)).toBe("success");
    });

    it("maps a True Active condition to success", () => {
      const object = buildScaledObject(spec, {
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Active", status: "True" },
        ],
      });
      expect(ScaledObject.getStatusClass(object)).toBe("success");
    });

    it("maps a True Fallback condition to warning", () => {
      const object = buildScaledObject(spec, {
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Fallback", status: "True" },
        ],
      });
      expect(ScaledObject.getStatusClass(object)).toBe("warning");
    });

    it("maps a True Paused condition to info", () => {
      const object = buildScaledObject(spec, {
        conditions: [
          { type: "Ready", status: "True" },
          { type: "Paused", status: "True" },
        ],
      });
      expect(ScaledObject.getStatusClass(object)).toBe("info");
    });

    it("maps a missing condition to no class", () => {
      expect(ScaledObject.getStatusClass(buildScaledObject(spec))).toBe("");
    });
  });

  describe("getTriggerSummary", () => {
    it("joins the trigger types of the spec", () => {
      const object = buildScaledObject({
        scaleTargetRef: { name: "example-app" },
        triggers: [{ type: "cpu" }, { type: "cron", metadata: { desired: "1" } }],
      });
      expect(ScaledObject.getTriggerSummary(object)).toBe("cpu, cron");
    });

    it("prefers the trigger types the controller wrote into the status", () => {
      const object = buildScaledObject(
        { scaleTargetRef: { name: "example-app" }, triggers: [{ type: "cpu" }] },
        { triggersTypes: ["cpu", "memory"] },
      );
      expect(ScaledObject.getTriggerSummary(object)).toBe("cpu, memory");
    });
  });

  describe("getScaleTarget", () => {
    it("prefers the kind resolved in the status over the one in the spec", () => {
      const object = buildScaledObject(
        { scaleTargetRef: { name: "example-app", kind: "StatefulSet" }, triggers: [{ type: "cpu" }] },
        { scaleTargetKind: "Deployment" },
      );
      expect(ScaledObject.getScaleTarget(object)).toBe("Deployment/example-app");
    });

    it("uses the kind of the spec when the status has none", () => {
      const object = buildScaledObject({
        scaleTargetRef: { name: "example-app", kind: "Deployment" },
        triggers: [{ type: "cpu" }],
      });
      expect(ScaledObject.getScaleTarget(object)).toBe("Deployment/example-app");
    });

    it("defaults the kind to Deployment", () => {
      const object = buildScaledObject({ scaleTargetRef: { name: "example-app" }, triggers: [{ type: "cpu" }] });
      expect(ScaledObject.getScaleTarget(object)).toBe("Deployment/example-app");
    });
  });

  describe("getPausedAnnotation", () => {
    it("is true when the paused-replicas annotation is present", () => {
      const object = new ScaledObject({
        apiVersion: "keda.sh/v1alpha1",
        kind: "ScaledObject",
        metadata: {
          name: "example-app",
          namespace: "default",
          selfLink: "/apis/keda.sh/v1alpha1/namespaces/default/scaledobjects/example-app",
          annotations: { "autoscaling.keda.sh/paused-replicas": "0" },
        },
        spec: { scaleTargetRef: { name: "example-app" }, triggers: [{ type: "cpu" }] },
      });
      expect(ScaledObject.getPausedAnnotation(object)).toBe(true);
    });

    it("is false when the annotation is absent", () => {
      const object = buildScaledObject({ scaleTargetRef: { name: "example-app" }, triggers: [{ type: "cpu" }] });
      expect(ScaledObject.getPausedAnnotation(object)).toBe(false);
    });
  });
});
