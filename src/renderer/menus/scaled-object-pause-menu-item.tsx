import { Common, Renderer } from "@freelensapp/extensions";
import { ScaledObject, scaledObjectStore } from "../api/scaledobject/scaledobject-v1";

const {
  Component: { ConfirmDialog, Icon, MenuItem },
} = Renderer;

export type ScaledObjectPauseMenuItemProps = Common.Types.KubeObjectMenuItemProps<ScaledObject>;

/**
 * Pauses, scales to zero or resumes the autoscaling of a ScaledObject through
 * the annotations the controller reads:
 *
 * - "Pause Autoscaling" writes `autoscaling.keda.sh/paused: "true"`, which
 *   freezes the target at its current replica count (KEDA 2.12 or newer).
 * - "Scale to Zero" writes `autoscaling.keda.sh/paused-replicas: "0"`, which
 *   scales the target to zero replicas and keeps it there. It asks for
 *   confirmation first, as the host does before deleting an object.
 * - "Resume Autoscaling" removes both annotations, as `kubectl annotate so
 *   <name> autoscaling.keda.sh/paused- autoscaling.keda.sh/paused-replicas-`
 *   does.
 */
export const ScaledObjectPauseMenuItem = ({ object, toolbar }: ScaledObjectPauseMenuItemProps) => {
  if (!object) return <></>;

  // A null value removes an annotation in a merge patch, which KEDA documents
  // for resuming; the host's patch type (string | undefined) does not admit
  // null, hence the cast.
  const annotate = (annotations: Record<string, string | null>) =>
    scaledObjectStore.patch(
      object,
      { metadata: { annotations: annotations as unknown as Record<string, string | undefined> } },
      "merge",
    );

  if (ScaledObject.getPausedAnnotation(object)) {
    return (
      <MenuItem
        onClick={() =>
          annotate({ [ScaledObject.pausedAnnotation]: null, [ScaledObject.pausedReplicasAnnotation]: null })
        }
      >
        <Icon material="play_circle_outline" interactive={toolbar} title="Resume Autoscaling" />
        <span className="title">Resume Autoscaling</span>
      </MenuItem>
    );
  }

  return (
    <>
      <MenuItem onClick={() => annotate({ [ScaledObject.pausedAnnotation]: "true" })}>
        <Icon material="pause_circle_outline" interactive={toolbar} title="Pause Autoscaling" />
        <span className="title">Pause Autoscaling</span>
      </MenuItem>
      <MenuItem
        onClick={() =>
          ConfirmDialog.open({
            message: (
              <>
                Scale <b>{ScaledObject.getScaleTarget(object)}</b> to zero replicas and keep it there until autoscaling
                is resumed?
              </>
            ),
            labelOk: "Scale to Zero",
            ok: () => annotate({ [ScaledObject.pausedReplicasAnnotation]: "0" }),
          })
        }
      >
        <Icon material="exposure_zero" interactive={toolbar} title="Scale to Zero" />
        <span className="title">Scale to Zero</span>
      </MenuItem>
    </>
  );
};
