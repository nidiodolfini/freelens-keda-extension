/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { ScaledObject, scaledObjectStore } from "./api/scaledobject/scaledobject-v1";
import { createAvailableVersionPage } from "./components/available-version";
import {
  withDetailsErrorBoundary,
  withMenuItemErrorBoundary,
  withPageErrorBoundary,
} from "./components/error-boundary";
import { ScaledObjectDetails } from "./details/scaled-object-details";
import { KedaIcon } from "./icons";
import { ScaledObjectPauseMenuItem, type ScaledObjectPauseMenuItemProps } from "./menus/scaled-object-pause-menu-item";
import { ScaledObjectsPage } from "./pages/scaled-objects-page";

// The kind serves a single API version, keda.sh/v1alpha1. The page still goes through
// createAvailableVersionPage so that it shows the "Not Available" page when the CRD is
// not installed in the cluster, and follows the host's API registry as it loads.
const ScaledObjectsPageAvailable = createAvailableVersionPage("Scaled Objects", [
  { kubeObjectClass: ScaledObject, PageComponent: ScaledObjectsPage, version: "v1alpha1" },
]);

// Every page, details panel and menu item renders inside an error boundary, so that an error it throws stays in its
// place: the host has none around the details drawer or a menu item, and its boundary around the cluster frame would
// replace the whole cluster view. Each registration field is mapped through its wrapper, so an entry added to it is
// wrapped too.
export default class KedaRenderer extends Renderer.LensExtension {
  onActivate() {
    // The v1 API registers the extension's stores with the cluster's
    // apiManager; `apiManager.getStore(apiBase)` resolves them when the
    // cluster serves the CRD, which is also what shows the page's "Not
    // Available" state before that.
    Renderer.K8sApi.apiManager.registerStore(scaledObjectStore);
  }

  clusterPages: Renderer.LensExtension["clusterPages"] = [
    {
      id: "scaled-objects",
      components: {
        Page: () => <ScaledObjectsPageAvailable extension={this} />,
      },
    },
  ].map((registration) => withPageErrorBoundary(this, registration));

  clusterPageMenus = [
    {
      id: "scaled-objects",
      title: "Scaled Objects",
      target: { pageId: "scaled-objects" },
      components: {
        Icon: KedaIcon,
      },
    },
  ];

  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    {
      kind: ScaledObject.kind,
      apiVersions: ScaledObject.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<ScaledObject>) => <ScaledObjectDetails {...props} />,
      },
    },
  ].map((registration) => withDetailsErrorBoundary(this, registration));

  kubeObjectMenuItems: Renderer.LensExtension["kubeObjectMenuItems"] = [
    {
      kind: ScaledObject.kind,
      apiVersions: ScaledObject.crd.apiVersions,
      components: {
        MenuItem: (props: ScaledObjectPauseMenuItemProps) => <ScaledObjectPauseMenuItem {...props} />,
      },
    },
  ].map((registration) => withMenuItemErrorBoundary(this, registration));
}
