import * as React from "react";
import { Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import {
	selectGroupsState,
	selectUserGroupsAccess,
	AccessLevel,
} from "@/store/groups";
import { useGroupEdit } from "@/edit/groups";

import ShowAccess from "@/components/ShowAccess";
import { GroupEntryForm } from "./GroupEntry";

function GroupDetail() {
	const access = useAppSelector(selectUserGroupsAccess);
	const readOnly = access <= AccessLevel.ro;
	const { loading } = useAppSelector(selectGroupsState);

	const {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		clickAdd,
		clickDelete,
	} = useGroupEdit(readOnly);

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
			<GroupEntryForm
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
						disabled={loading || readOnly}
						active={state.action === "add"}
						onClick={clickAdd}
					/>
					<Button
						variant="outline-danger"
						className="bi-trash"
						title="Delete group"
						disabled={state.action !== "update" || readOnly}
						onClick={clickDelete}
					/>
				</div>
			</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}

export default GroupDetail;
