import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import styles from "./available-version.module.scss";
import stylesInline from "./available-version.module.scss?inline";

export interface AvailableVersionPageProps {
  extension: Renderer.LensExtension;
}

/**
 * Configuration for a single API version variant.
 */
interface VersionVariant<T extends AvailableVersionPageProps> {
  kubeObjectClass: typeof Renderer.K8sApi.KubeObject<any, any, any>;
  PageComponent: React.ComponentType<T>;
  version: string;
}

/**
 * Creates a page component that automatically selects the correct API version based on cluster availability.
 *
 * Tries versions in order and renders the first available one.
 * Shows a helpful message if no versions are available (CRD not installed).
 *
 * In the v1 API, availability is the cluster's apiManager: it knows an apiBase
 * only when the cluster actually serves the CRD, so the page checks
 * `apiManager.getStore(kubeObjectClass.apiBase)` instead of a `getStore()`
 * static on the model.
 *
 * The component is an observer: `getStore()` reads the host's observable API registry, so the page renders again
 * when the host registers an API after the page was first rendered, as it does for a page opened while the cluster
 * frame is still loading its CRDs.
 *
 * @param resourceName - Human-readable resource name (e.g., "External Secrets")
 * @param variants - Array of version variants, ordered by preference
 * @returns A page component that auto-detects a valid API version if present
 *
 * @example
 * ```tsx
 * createAvailableVersionPage(
 *   "External Secrets",
 *   [
 *     { kubeObjectClass: ExternalSecret, PageComponent: ExternalSecretsPage, version: "v1" },
 *   ]
 * );
 * ```
 */
export function createAvailableVersionPage<T extends AvailableVersionPageProps>(
  resourceName: string,
  variants: VersionVariant<T>[],
): React.ComponentType<T> {
  return observer((props: T) => {
    for (const variant of variants) {
      try {
        const store = Renderer.K8sApi.apiManager.getStore(variant.kubeObjectClass.apiBase);
        if (store) {
          Common.logger.debug(
            `[${props.extension.name}]: Rendering ${resourceName} page with API version ${variant.version}`,
          );
          return <variant.PageComponent {...props} />;
        }
      } catch (error) {
        Common.logger.debug(
          `[${props.extension.name}]: API version ${variant.version} not available for ${resourceName}: ${error}`,
        );
      }
    }

    // No version available - CRD not installed in cluster
    const triedVersions = variants.map((v) => v.version).join(", ");
    Common.logger.info(
      `[${props.extension.name}]: ${resourceName} CRD not found in cluster (tried versions: ${triedVersions})`,
    );

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.unavailablePage}>
          <div className={styles.unavailableContent}>
            <h3 className={styles.unavailableTitle}>{resourceName} Not Available</h3>
            <p className={styles.unavailableMessage}>
              The <strong>{resourceName}</strong> CRDs are not installed in this cluster.
            </p>
            <p className={styles.unavailableDetails}>
              Tried API versions: <code>{triedVersions}</code>
            </p>
          </div>
        </div>
      </>
    );
  });
}
