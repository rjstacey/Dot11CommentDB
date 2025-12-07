import { useAppSelector } from "@/store/hooks";
import { selectUserMembersAccess, AccessLevel } from "@/store/members";
import { selectImatAttendanceSummarySelected } from "@/store/imatAttendanceSummary";

import ShowAccess from "@/components/ShowAccess";
import { AttendanceEditForm } from "./AttendanceEditForm";
import { useSessionAttendanceEdit } from "@/edit/sessionAttendance";
import { AttendanceUpdateForm } from "./AttendanceUpdateForm";

export function MemberAttendanceDetail() {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;
	const selected = useAppSelector(
		selectImatAttendanceSummarySelected
	) as number[];

	const {
		state,
		submit,
		cancel,
		hasChanges,
		memberOnChange,
		attendanceOnChange,
	} = useSessionAttendanceEdit(selected, readOnly);

	let title: string = "Member detail";
	if (state.action === "updateOne" && hasChanges()) {
		title = "Update member";
	} else if (state.action === "addOne") {
		title = "Add member";
	}

	let content: React.ReactNode;
	if (state.action === null) {
		content = (
			<div className="details-panel-placeholder">
				<span>{state.message}</span>
			</div>
		);
	} else if (state.action === "addOne" || state.action === "updateOne") {
		content = (
			<AttendanceEditForm
				action={state.action}
				sapin={state.ids[0]}
				editedMember={state.memberEdit}
				savedMember={state.memberSaved}
				memberOnChange={memberOnChange}
				editedAttendance={state.attendanceEdit}
				savedAttendance={state.attendanceSaved}
				attendanceOnChange={attendanceOnChange}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else if (state.action === "updateMany") {
		content = (
			<AttendanceUpdateForm
				adds={state.adds}
				updates={state.updates}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
			/>
		);
	}

	return (
		<>
			<div className="d-flex align-items-center justify-content-between mb-3">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
			</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}
