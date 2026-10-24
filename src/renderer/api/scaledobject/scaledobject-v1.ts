import { Renderer } from "@freelensapp/extensions";

import type { KedaCondition, KedaKubeObjectCRD, ScaledObjectSpec, ScaledObjectStatus } from "../types";

export type { ScaledObjectSpec, ScaledObjectStatus };

/**
 * A ScaledObject of `keda.sh/v1alpha1` (KEDA v2): declares how the KEDA
 * operator scales the referenced workload, and which scalers (triggers)
 * produce the metric values.
 */
export class ScaledObject extends Renderer.K8sApi.KubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ScaledObjectStatus,
  ScaledObjectSpec
> {
  static readonly kind = "ScaledObject";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/keda.sh/v1alpha1/scaledobjects";

  static readonly crd: KedaKubeObjectCRD = {
    apiVersions: ["keda.sh/v1alpha1"],
    plural: "scaledobjects",
    singular: "scaledobject",
    shortNames: ["so"],
    title: "Scaled Objects",
  };

  static getCondition(object: ScaledObject, type: string): KedaCondition | undefined {
    return object.status?.conditions?.find((condition) => condition.type === type);
  }

  /**
   * The READY column of `kubectl get so`, from the Ready condition.
   */
  static getReady(object: ScaledObject): boolean | undefined {
    const condition = ScaledObject.getCondition(object, "Ready");
    if (condition?.status === "True") return true;
    if (condition?.status === "False") return false;
    return undefined;
  }

  /**
   * From the Active condition: whether a trigger currently reports activity.
   */
  static getActive(object: ScaledObject): boolean | undefined {
    const condition = ScaledObject.getCondition(object, "Active");
    if (condition?.status === "True") return true;
    if (condition?.status === "False") return false;
    return undefined;
  }

  /**
   * From the Fallback condition: whether the fallback replicas are in use.
   */
  static getFallback(object: ScaledObject): boolean | undefined {
    const condition = ScaledObject.getCondition(object, "Fallback");
    if (condition?.status === "True") return true;
    if (condition?.status === "False") return false;
    return undefined;
  }

  /**
   * From the Paused condition: whether the `autoscaling.keda.sh/paused-replicas`
   * annotation is in effect. The controller writes no Paused condition while
   * the object is not paused (an Unknown status means the same here).
   */
  static getPaused(object: ScaledObject): boolean | undefined {
    const condition = ScaledObject.getCondition(object, "Paused");
    if (condition?.status === "True") return true;
    if (condition?.status === "False") return false;
    return undefined;
  }

  /**
   * The STATUS column of `kubectl get so`, following the controller's
   * precedence: an error of the Ready condition wins, then Paused, Fallback,
   * Active and Ready.
   */
  static getStatusText(object: ScaledObject): string {
    if (ScaledObject.getReady(object) === false) {
      return ScaledObject.getCondition(object, "Ready")?.reason ?? "Error";
    }
    if (ScaledObject.getPaused(object)) return "Paused";
    if (ScaledObject.getFallback(object)) return "Fallback";
    if (ScaledObject.getActive(object)) return "Active";
    if (ScaledObject.getReady(object)) return "Ready";
    return "Unknown";
  }

  static getStatusClass(object: ScaledObject): string {
    if (ScaledObject.getReady(object) === false) return "error";
    if (ScaledObject.getFallback(object)) return "warning";
    if (ScaledObject.getPaused(object)) return "info";
    if (ScaledObject.getActive(object)) return "success";
    if (ScaledObject.getReady(object)) return "success";
    return "";
  }

  /**
   * The SCALETARGET column of `kubectl get so`: `kind/name`, preferring the
   * kind the controller resolved in the status over the one in the spec, and
   * defaulting to a Deployment.
   */
  static getScaleTarget(object: ScaledObject): string {
    const kind = object.status?.scaleTargetKind ?? object.spec.scaleTargetRef.kind ?? "Deployment";
    return `${kind}/${object.spec.scaleTargetRef.name}`;
  }

  static getScaleTargetName(object: ScaledObject): string {
    return object.spec.scaleTargetRef.name;
  }

  static getMin(object: ScaledObject): number | undefined {
    return object.spec.minReplicaCount;
  }

  static getMax(object: ScaledObject): number | undefined {
    return object.spec.maxReplicaCount;
  }

  static getPollingInterval(object: ScaledObject): number | undefined {
    return object.spec.pollingInterval;
  }

  static getCooldownPeriod(object: ScaledObject): number | undefined {
    return object.spec.cooldownPeriod;
  }

  /**
   * The TRIGGERS column of `kubectl get so`: the scaler types, preferring the
   * list the controller wrote into the status over the one in the spec.
   */
  static getTriggerTypes(object: ScaledObject): string[] {
    return object.status?.triggersTypes ?? object.spec.triggers.map((trigger) => trigger.type);
  }

  static getTriggerSummary(object: ScaledObject): string {
    return ScaledObject.getTriggerTypes(object).join(", ");
  }

  static getAuthenticationTypes(object: ScaledObject): string[] | undefined {
    return object.status?.authenticationsTypes;
  }

  /**
   * Whether the `autoscaling.keda.sh/paused-replicas` annotation is present on
   * the object, which is what the pause/resume menu item writes.
   */
  static getPausedAnnotation(object: ScaledObject): boolean {
    return "autoscaling.keda.sh/paused-replicas" in (object.metadata.annotations ?? {});
  }
}

export class ScaledObjectApi extends Renderer.K8sApi.KubeApi<ScaledObject> {}

// `autoRegister: false` keeps the API out of the cluster's apiManager: the
// "Not Available" page of `createAvailableVersionPage` relies on the apiBase
// being found only when the cluster actually serves the CRD. The store below
// is registered in the extension's `onActivate` instead.
export const scaledObjectApi = new ScaledObjectApi({
  objectConstructor: ScaledObject,
  autoRegister: false,
});

export class ScaledObjectStore extends Renderer.K8sApi.KubeObjectStore<ScaledObject> {
  readonly api = scaledObjectApi;
}

export const scaledObjectStore = new ScaledObjectStore();
