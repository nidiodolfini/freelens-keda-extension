import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ScaledObject } from "../api/scaledobject/scaledobject-v1";
import styles from "./scaled-object-details.module.scss";
import stylesInline from "./scaled-object-details.module.scss?inline";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem },
} = Renderer;

export type ScaledObjectDetailsProps = Renderer.Component.KubeObjectDetailsProps<ScaledObject>;

/**
 * A core Event of the host, as the cluster's `/api/v1/events` store keeps it.
 * The v1 API exposes no typed event model, so the panel reads the few fields
 * it renders and treats the items as this structural type.
 */
interface HostEvent {
  type?: string;
  reason?: string;
  message?: string;
  count?: number;
  lastTimestamp?: string;
  firstTimestamp?: string;
  source?: {
    component?: string;
  };
  involvedObject?: {
    kind?: string;
    name?: string;
    namespace?: string;
    uid?: string;
  };
}

/** A store shaped like the host's event store: enough to read its items. */
type HostEventStore = { items: HostEvent[] };

function conditionClass(status: string): string {
  switch (status) {
    case "True":
      return "success";
    case "False":
      return "error";
    default:
      return "warning";
  }
}

/** Whether an event involves this ScaledObject (kind, name, namespace, uid). */
function eventInvolvesScaledObject(event: HostEvent, object: ScaledObject): boolean {
  const involved = event.involvedObject;
  if (involved?.kind !== "ScaledObject") return false;
  if (involved.name !== object.getName()) return false;
  if (involved.namespace !== object.getNs()) return false;
  // Defensive: only when the event carries a uid, require it to match.
  if (involved.uid && involved.uid !== object.getId()) return false;
  return true;
}

/** Milliseconds of an event's lastTimestamp, or 0 when absent/unparsable. */
function eventTime(event: HostEvent): number {
  if (!event.lastTimestamp) return 0;
  const parsed = Date.parse(event.lastTimestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export const ScaledObjectDetails = observer(({ object }: ScaledObjectDetailsProps) => {
  const conditions = object.status?.conditions;
  const triggers = object.spec.triggers ?? [];
  const fallback = object.spec.fallback;

  // The host keeps the cluster's core events in its apiManager under the
  // events apiBase; the store resolves only while the cluster serves it. The
  // panel is an observer, so it renders again when new events arrive.
  let eventsStore: HostEventStore | undefined;
  try {
    eventsStore = Renderer.K8sApi.apiManager.getStore("/api/v1/events") as unknown as HostEventStore | undefined;
  } catch {
    eventsStore = undefined;
  }

  const events = (eventsStore?.items ?? [])
    .filter((event) => eventInvolvesScaledObject(event, object))
    .sort((a, b) => eventTime(b) - eventTime(a))
    .slice(0, 20);

  return (
    <>
      <style>{stylesInline}</style>
      <DrawerItem name="Scale Target">
        {ScaledObject.getScaleTarget(object)}
        {object.spec.scaleTargetRef.apiVersion ? ` (${object.spec.scaleTargetRef.apiVersion})` : ""}
      </DrawerItem>
      <DrawerItem name="Min Replicas">{object.spec.minReplicaCount ?? "-"}</DrawerItem>
      <DrawerItem name="Max Replicas">{object.spec.maxReplicaCount ?? "-"}</DrawerItem>
      <DrawerItem name="Polling Interval">
        {object.spec.pollingInterval !== undefined ? `${object.spec.pollingInterval}s` : "-"}
      </DrawerItem>
      <DrawerItem name="Cooldown Period">
        {object.spec.cooldownPeriod !== undefined ? `${object.spec.cooldownPeriod}s` : "-"}
      </DrawerItem>
      <DrawerItem name="Idle Replica Count">{object.spec.idleReplicaCount ?? "-"}</DrawerItem>
      <DrawerItem name="Initial Cooldown Period">
        {object.spec.initialCooldownPeriod !== undefined ? `${object.spec.initialCooldownPeriod}s` : "-"}
      </DrawerItem>
      <DrawerItem name="Restore To Original">
        {object.spec.advanced?.restoreToOriginalReplicaCount !== undefined
          ? String(object.spec.advanced.restoreToOriginalReplicaCount)
          : "-"}
      </DrawerItem>
      <DrawerItem name="Triggers" labelsOnly hidden={triggers.length === 0}>
        {triggers.map((trigger, index) => (
          <DrawerItem
            key={`${trigger.type}-${trigger.name ?? index}`}
            name={
              <>
                <Badge label={trigger.type} /> {trigger.name}
              </>
            }
          >
            {trigger.metadata &&
              Object.entries(trigger.metadata).map(([key, value]) => (
                <DrawerItem key={key} name={key}>
                  {value}
                </DrawerItem>
              ))}
            {trigger.authenticationRef && (
              <DrawerItem name="Authentication Ref">
                {trigger.authenticationRef.kind ?? "TriggerAuthentication"}/{trigger.authenticationRef.name}
              </DrawerItem>
            )}
          </DrawerItem>
        ))}
      </DrawerItem>
      <DrawerItem name="Fallback">
        {fallback
          ? `enabled (failureThreshold: ${fallback.failureThreshold}, replicas: ${fallback.replicas})`
          : "Disabled"}
      </DrawerItem>
      <DrawerItem name="Conditions" labelsOnly hidden={!conditions?.length}>
        {conditions?.map((condition, index) => (
          <Badge
            key={condition.type + index}
            label={condition.reason || condition.type}
            className={conditionClass(condition.status)}
            tooltip={condition.message}
          />
        ))}
      </DrawerItem>
      <DrawerItem name="External Metric Names">
        {ScaledObject.getExternalMetricNames(object).join(", ") || "-"}
      </DrawerItem>
      <DrawerItem name="Original Replica Count">{object.status?.originalReplicaCount ?? "-"}</DrawerItem>
      <DrawerItem name="Last Active Time">{object.status?.lastActiveTime ?? "-"}</DrawerItem>
      <DrawerItem name="Paused">{ScaledObject.getPausedAnnotation(object) ? "Yes" : "No"}</DrawerItem>
      {eventsStore && (
        <DrawerItem name="Scaling Events">
          {events.length === 0 ? (
            "No events"
          ) : (
            <table className={styles.eventsTable}>
              <thead>
                <tr>
                  <th className={styles.eventsType}>Type</th>
                  <th className={styles.eventsReason}>Reason</th>
                  <th className={styles.eventsMessage}>Message</th>
                  <th className={styles.eventsCount}>Count</th>
                  <th className={styles.eventsLastSeen}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr key={`${event.reason ?? "event"}-${event.count ?? 0}-${index}`}>
                    <td>
                      <Badge label={event.type ?? "Normal"} className={event.type === "Warning" ? "warning" : ""} />
                    </td>
                    <td>{event.reason ?? "-"}</td>
                    <td className={styles.eventsMessage}>{event.message ?? "-"}</td>
                    <td>{event.count ?? 1}</td>
                    <td>{event.lastTimestamp ?? event.firstTimestamp ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DrawerItem>
      )}
    </>
  );
});
