import { Button } from "react-bootstrap";
import type { EntityId } from "@reduxjs/toolkit";

import { useAppSelector } from "@/store/hooks";
import { selectUserMembersAccess, AccessLevel } from "@/store/members";

import ShowAccess from "@/components/ShowAccess";
import { MemberEditForm } from "./MemberEditForm";
import { useMemberEdit } from "./useMembersEdit";

export function MemberDetail({
	selected,
	setSelected,
}: {
	selected: EntityId[];
	setSelected: (ids: EntityId[]) => void;
}) {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;

	const {
		state,
		onChange,
		hasChanges,
		submit,
		cancel,
		clickAdd,
		clickDelete,
	} = useMemberEdit({
		selected,
		setSelected,
		readOnly,
	});

	let title: string;
	if (state.action === "add") {
		title = "Add member" + (state.originals.length > 1 ? "s" : "");
	} else if (state.action === "update") {
		title = "Update member" + (state.originals.length > 1 ? "s" : "");
	} else {
		title = "Member detail";
	}

	return (
		<>
			<div className="d-flex align-items-center justify-content-between">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
				{!readOnly && (
					<div className="d-flex gap-2">
						<Button
							variant="outline-primary"
							className="bi-plus-lg"
							title="Add member"
							disabled={readOnly}
							active={state.action === "add"}
							onClick={clickAdd}
						/>
						<Button
							variant="outline-danger"
							className="bi-trash"
							title="Delete member"
							disabled={
								(state.action === "view" &&
									Boolean(state.message)) ||
								readOnly
							}
							onClick={clickDelete}
						/>
					</div>
				)}
			</div>
			{state.action === "view" && state.message ? (
				<div className="details-panel-placeholder">
					<span>{state.message}</span>
				</div>
			) : (
				<MemberEditForm
					action={state.action}
					sapins={state.originals.map((m) => m.SAPIN)}
					edited={state.edited!}
					saved={state.saved!}
					onChange={onChange}
					hasChanges={hasChanges}
					submit={submit}
					cancel={cancel}
					readOnly={readOnly}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}
