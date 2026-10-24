import { Renderer } from "@freelensapp/extensions";

import type { BaseKubeObjectCondition } from "@freelensapp/kube-object";

/**
 * The CRD metadata of a KEDA resource, with the human-readable title the
 * extension shows in its pages.
 */
export interface KedaKubeObjectCRD extends Renderer.K8sApi.LensExtensionKubeObjectCRD {
  title: string;
}

/**
 * A status condition, as KEDA writes it into `status.conditions`: the
 * `BaseKubeObjectCondition` of `@freelensapp/kube-object`.
 */
export type KedaCondition = BaseKubeObjectCondition;

/**
 * `spec.triggers[]`: one scaler configuration. The controller requires the
 * scaler `type` (`cpu`, `memory`, `cron`, `prometheus`, ...); `name` is
 * optional and used to resolve the matching AuthenticationRef.
 */
export interface ScaledObjectTrigger {
  type: string;
  name?: string;
  metricType?: string;
  metadata?: Record<string, string>;
  authenticationRef?: {
    name: string;
    kind?: string;
  };
}

/**
 * `spec.scaleTargetRef`: the workload the controller scales (defaults to
 * `kind: Deployment` when omitted).
 */
export interface ScaledObjectScaleTargetRef {
  name: string;
  kind?: string;
  apiVersion?: string;
}

export interface ScaledObjectSpec {
  scaleTargetRef: ScaledObjectScaleTargetRef;
  minReplicaCount?: number;
  maxReplicaCount?: number;
  pollingInterval?: number;
  cooldownPeriod?: number;
  idleReplicaCount?: number;
  initialCooldownPeriod?: number;
  triggers: ScaledObjectTrigger[];
  advanced?: {
    restoreToOriginalReplicaCount?: boolean;
    horizontalPodAutoscalerConfig?: {
      name?: string;
      behavior?: unknown;
    };
  };
  fallback?: {
    failureThreshold: number;
    replicas: number;
  };
}

export interface ScaledObjectStatus {
  scaleTargetKind?: string;
  originalReplicaCount?: number;
  lastActiveTime?: string;
  // KEDA versions differ on the JSON shape of these: recent releases write
  // arrays, older ones a comma-separated string ("cpu,memory"). Both are
  // accepted and normalized by the model's static helpers.
  externalMetricNames?: string | string[];
  triggersTypes?: string | string[];
  authenticationsTypes?: string | string[];
  conditions?: KedaCondition[];
}
