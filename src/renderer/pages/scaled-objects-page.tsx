import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ScaledObject, type ScaledObjectApi, scaledObjectStore } from "../api/scaledobject/scaledobject-v1";
import styles from "./scaled-objects-page.module.scss";
import stylesInline from "./scaled-objects-page.module.scss?inline";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = ScaledObject;
type KubeObject = ScaledObject;
type KubeObjectApi = ScaledObjectApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  scaleTarget: (object: KubeObject) => KubeObject.getScaleTarget(object),
  min: (object: KubeObject) => KubeObject.getMin(object) ?? Number.POSITIVE_INFINITY,
  max: (object: KubeObject) => KubeObject.getMax(object) ?? Number.POSITIVE_INFINITY,
  triggers: (object: KubeObject) => KubeObject.getTriggerSummary(object),
  status: (object: KubeObject) => KubeObject.getStatusText(object),
  ready: (object: KubeObject) => String(KubeObject.getReady(object)),
  active: (object: KubeObject) => String(KubeObject.getActive(object)),
  fallback: (object: KubeObject) => String(KubeObject.getFallback(object)),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Scale Target", sortBy: "scaleTarget", className: styles.scaleTarget },
  { title: "Min", sortBy: "min", className: styles.min },
  { title: "Max", sortBy: "max", className: styles.max },
  { title: "Triggers", sortBy: "triggers", className: styles.triggers },
  { title: "Status", sortBy: "status", className: styles.status },
  { title: "Ready", sortBy: "ready", className: styles.ready },
  { title: "Active", sortBy: "active", className: styles.active },
  { title: "Fallback", sortBy: "fallback", className: styles.fallback },
  { title: "Age", sortBy: "age", className: styles.age },
];

// The columns mirror `kubectl get so`: SCALETARGET, MIN, MAX, TRIGGERS, STATUS, READY, ACTIVE, FALLBACK.
export const ScaledObjectsPage = observer(() => {
  const store = scaledObjectStore;

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<KubeObject, KubeObjectApi>
        tableId={`${KubeObject.crd.plural}Table`}
        className={styles.page}
        store={store}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: KubeObject) => object.getSearchFields()]}
        renderHeaderTitle={KubeObject.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: KubeObject) => [
          <WithTooltip>{object.getName()}</WithTooltip>,
          <LinkToNamespace namespace={object.getNs()} />,
          <WithTooltip>{KubeObject.getScaleTarget(object)}</WithTooltip>,
          KubeObject.getMin(object) ?? "-",
          KubeObject.getMax(object) ?? "-",
          <WithTooltip>{KubeObject.getTriggerSummary(object)}</WithTooltip>,
          <Badge label={KubeObject.getStatusText(object)} className={KubeObject.getStatusClass(object)} />,
          <BadgeBoolean value={KubeObject.getReady(object)} />,
          <BadgeBoolean value={KubeObject.getActive(object)} />,
          <BadgeBoolean value={KubeObject.getFallback(object)} />,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});
