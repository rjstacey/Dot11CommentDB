import { useAppSelector } from "@/store/hooks";
import { selectUserMembersAccess, AccessLevel } from "@/store/members";
import { selectSessionRegistrationSelected } from "@/store/sessionRegistration";

import { useSessionRegistrationEdit } from "@/hooks/sessionRegistrationEdit";
import ShowAccess from "@/components/ShowAccess";
import { RegistrationEditForm } from "./RegistrationEditForm";
import { RegistrationUpdateForm } from "./RegistrationUpdateForm";
import { RegistrationUnmatchedForm } from "./RegistrationUnmatchedForm";

export function RegistrationDetail() {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;
	const selected = useAppSelector(
		selectSessionRegistrationSelected,
	) as number[];

	const { state, submit, cancel, hasChanges, onChange } =
		useSessionRegistrationEdit(selected, readOnly);

	let title = "Registration detail";
	if (state.action === "updateOne" && hasChanges()) {
		title = "Update registration";
	}
	let content: React.ReactNode;
	if (state.action === null) {
		content = (
			<div className="placeholder">
				<span>{state.message}</span>
			</div>
		);
	} else if (state.action === "updateOne") {
		content = (
			<RegistrationEditForm
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
				numUpdates={state.adds.length + state.updates.length}
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
