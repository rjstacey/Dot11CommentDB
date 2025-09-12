import { Multiple } from "@common";

import type { Resolution, ResolutionChange } from "@/store/comments";
import { AccessLevel } from "@/store/user";
import { ResolutionAssigneeMotionRow } from "./ResolutionAssigneeMotionRow";
import { ResolutionRow } from "./ResolutionRow";

export type ResolutionEditable = Required<
	Omit<ResolutionChange, "ResolutionID">
>;

export function ResolutionEdit({
	resolution,
	updateResolution,
	readOnly,
	commentsAccess = AccessLevel.none,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
	commentsAccess?: number;
}) {
	return (
		<>
			<ResolutionAssigneeMotionRow
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly}
				commentsAccess={commentsAccess}
			/>
			<ResolutionRow
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly}
			/>
		</>
	);
}

export default ResolutionEdit;
