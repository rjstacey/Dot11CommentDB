import { useAppSelector } from "@/store/hooks";
import { selectUserMembersAccess, AccessLevel } from "@/store/members";
import { selectImatAttendanceSummarySelectedSyncedIds } from "@/store/imatAttendanceSummary";

import ShowAccess from "@/components/ShowAccess";
import { AttendanceEditForm } from "./AttendanceEditForm";
import { useSessionAttendanceEdit } from "@/hooks/sessionAttendanceEdit";
import { AttendanceUpdateForm } from "./AttendanceUpdateForm";

export function MemberAttendanceDetail() {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;
	const selected = useAppSelector(
		selectImatAttendanceSummarySelectedSyncedIds,
	) as number[];

	const {
		state,
		submit,
		cancel,
		hasChanges,
		hasMemberChanges,
		hasAttendanceChanges,
		memberOnChange,
		attendanceOnChange,
	} = useSessionAttendanceEdit(selected, readOnly);

	let title = "Member detail";
	if (state.action === "updateOne" && hasChanges()) {
		title = "Update member";
	} else if (state.action === "addOne") {
		title = "Add member";
	}

	let content: React.ReactNode;
	if (state.action === null) {
		content = (
			<div className="placeholder">
				<span>{state.message}</span>
			</div>
		);
	} else if (state.action === "addOne" || state.action === "updateOne") {
		content = (
			<AttendanceEditForm
				state={state}
				sapin={state.ids[0]}
				memberOnChange={memberOnChange}
				attendanceOnChange={attendanceOnChange}
				hasMemberChanges={hasMemberChanges}
				hasAttendanceChanges={hasAttendanceChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else if (state.action === "updateMany") {
		content = (
			<AttendanceUpdateForm
				state={state}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
			/>
		);
	}

	return (
		<>
			<div className="title-row">
				<h3>{title}</h3>
			</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}
