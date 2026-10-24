import { Common, Renderer } from "@freelensapp/extensions";
import { ScaledObject, scaledObjectStore } from "../api/scaledobject/scaledobject-v1";

const {
  Component: { Icon, MenuItem },
} = Renderer;

export type ScaledObjectPauseMenuItemProps = Common.Types.KubeObjectMenuItemProps<ScaledObject>;

/**
 * Pauses or resumes the autoscaling of a ScaledObject by writing the
 * `autoscaling.keda.sh/paused-replicas` annotation, as `kubectl annotate so
 * <name> autoscaling.keda.sh/paused-replicas=<n> --overwrite` does. The value
 * "0" scales the target to zero replicas and freezes it there; removing the
 * annotation (null in the merge patch) resumes normal scaling.
 */
export const ScaledObjectPauseMenuItem = ({ object, toolbar }: ScaledObjectPauseMenuItemProps) => {
  if (!object) return <></>;

  const paused = ScaledObject.getPausedAnnotation(object);

  const togglePause = async () => {
    // A null value removes the annotation in a merge patch, which KEDA
    // documents for resuming; the host's patch type (string | undefined) does
    // not admit null, hence the cast.
    const annotations = {
      "autoscaling.keda.sh/paused-replicas": paused ? null : "0",
    } as unknown as Record<string, string | undefined>;

    await scaledObjectStore.patch(
      object,
      {
        metadata: {
          annotations,
        },
      },
      "merge",
    );
  };

  return (
    <MenuItem onClick={togglePause}>
      <Icon
        material={paused ? "play_circle_outline" : "pause_circle_filled"}
        interactive={toolbar}
        title={paused ? "Resume Autoscaling" : "Pause Autoscaling"}
      />
      <span className="title">{paused ? "Resume Autoscaling" : "Pause Autoscaling"}</span>
    </MenuItem>
  );
};
