import * as React from "react";
import { Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectUserGroupsAccess, AccessLevel } from "@/store/groups";
import { useGroupsEdit } from "@/edit/groupsEdit";

import ShowAccess from "@/components/ShowAccess";
import { GroupsEditForm } from "./GroupsEditForm";

function GroupsDetail() {
	const access = useAppSelector(selectUserGroupsAccess);
	const readOnly = access <= AccessLevel.ro;

	const {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		onAdd,
		disableAdd,
		onDelete,
		disableDelete,
	} = useGroupsEdit(readOnly);

	let title = "";
	let content: React.ReactNode;
	if (state.action === null) {
		title = "Group detail";
		content = (
			<div className="details-panel-placeholder">{state.message}</div>
		);
	} else {
		title = state.action === "add" ? "Add group" : "Update group";
		content = (
			<GroupsEditForm
				action={state.action}
				entry={state.edited}
				hasChanges={hasChanges}
				onChange={onChange}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	}

	return (
		<>
			<div className="d-flex align-items-center justify-content-between mb-3">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
				<div className="d-flex gap-2">
					<Button
						variant="outline-primary"
						className="bi-plus-lg"
						title="Add group"
						disabled={disableAdd}
						active={state.action === "add"}
						onClick={onAdd}
					/>
					<Button
						variant="outline-danger"
						className="bi-trash"
						title="Delete group"
						disabled={disableDelete}
						onClick={onDelete}
					/>
				</div>
			</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}

export default GroupsDetail;
