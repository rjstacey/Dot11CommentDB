import { useParams } from "react-router";
import { useAppSelector } from "@/store/hooks";
import { selectUserMembersAccess, AccessLevel } from "@/store/members";

import ShowAccess from "@/components/ShowAccess";
import { AttendanceEditForm } from "./AttendanceEditForm";
import { useMemberAttendanceEdit } from "./useMemberAttendanceEdit";

export function MemberAttendanceDetail() {
	const sessionNumber = Number(useParams().sessionNumber);
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;

	const { state, submit, cancel, changeMember, changeAttendance } =
		useMemberAttendanceEdit(sessionNumber, readOnly);

	let title: string;
	if (state.action === "add") {
		title = "Add member" + (state.members.length > 1 ? "s" : "");
	} else if (state.action === "update") {
		title = "Update member" + (state.members.length > 1 ? "s" : "");
	} else {
		title = "Member detail";
	}

	return (
		<>
			<div className="d-flex align-items-center justify-content-between mb-3">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
			</div>
			{state.action === "view" && state.message ? (
				<div className="details-panel-placeholder">
					<span>{state.message}</span>
				</div>
			) : (
				<AttendanceEditForm
					action={state.action}
					sapins={state.members.map((m) => m.SAPIN)}
					editedMember={state.editedMember!}
					savedMember={
						state.action !== "add" ? state.savedMember! : undefined
					}
					onChangeMember={changeMember}
					editedAttendance={state.editedAttendance!}
					savedAttendance={state.savedAttendance!}
					onChangeAttendance={changeAttendance}
					submit={submit}
					cancel={cancel}
					readOnly={readOnly}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}
