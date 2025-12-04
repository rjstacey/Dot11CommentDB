import { useAppSelector } from "@/store/hooks";
import { selectUserMembersAccess, AccessLevel } from "@/store/members";
import { selectSessionRegistrationSelected } from "@/store/sessionRegistration";

import { useSessionRegistrationEdit } from "@/edit/useSessionRegistrationEdit";
import ShowAccess from "@/components/ShowAccess";
import { RegistrationEditForm } from "./RegistrationEditForm";
import { RegistrationUpdateForm } from "./RegistrationUpdateForm";
import { RegistrationUnmatchedForm } from "./RegistrationUnmatchedForm";

export function RegistrationDetail() {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;
	const selected = useAppSelector(
		selectSessionRegistrationSelected
	) as number[];

	const { state, submit, cancel, hasChanges, onChange } =
		useSessionRegistrationEdit(selected, readOnly);

	let title: string = "Registration detail";
	if (state.action === "updateOne" && hasChanges()) {
		title = "Update registration";
	}
	let content: React.ReactNode;
	if (state.action === null) {
		content = (
			<div className="details-panel-placeholder">
				<span>{state.message}</span>
			</div>
		);
	} else if (state.action === "updateOne") {
		content = (
			<RegistrationEditForm
				member={state.member}
				registration={state.registration}
				edited={state.attendanceEdit}
				saved={state.attendanceSaved}
				onChange={onChange}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
			/>
		);
	} else if (state.action === "unmatched") {
		content = (
			<RegistrationUnmatchedForm
				registration={state.registration}
				submit={submit}
				cancel={cancel}
			/>
		);
	} else if (state.action === "updateMany") {
		content = (
			<RegistrationUpdateForm
				attendances={state.attendances}
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
