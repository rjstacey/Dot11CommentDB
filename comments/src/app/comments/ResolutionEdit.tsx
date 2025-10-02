import { Multiple } from "@common";

import type { Resolution, ResolutionChange } from "@/store/comments";
import { AccessLevel } from "@/store/user";
import { ResolutionAssigneeSubmissionRow } from "./ResolutionAssigneeRow";
import { ResolutionRow } from "./ResolutionRow";
import { ResolutionApprovalRow } from "./ResolutionApprovalRow";

export type ResolutionEditable = Required<
	Omit<ResolutionChange, "ResolutionID">
>;

export function ResolutionEdit({
	resolution,
	updateResolution,
	readOnly,
	commentsAccess,
}: {
	resolution: Multiple<ResolutionEditable>;
	updateResolution: (changes: Partial<Resolution>) => void;
	readOnly?: boolean;
	commentsAccess: number;
}) {
	return (
		<>
			<ResolutionAssigneeSubmissionRow
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly}
			/>
			<ResolutionRow
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly}
			/>
			<ResolutionApprovalRow
				resolution={resolution}
				updateResolution={updateResolution}
				readOnly={readOnly || commentsAccess <= AccessLevel.ro}
			/>
		</>
	);
}

export default ResolutionEdit;
