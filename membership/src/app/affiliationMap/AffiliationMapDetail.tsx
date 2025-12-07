import * as React from "react";
import { Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel, selectUserMembersAccess } from "@/store/members";
import { useAffiliationMapEdit } from "@/edit/affiliationMapEdit";
import ShowAccess from "@/components/ShowAccess";
import { AffiliationMapEntryForm } from "./AffiliationMapEntryForm";
import { AffiliationMapMatches } from "./AffiliationMapMatches";
import { AffiliationMapUnmatched } from "./AffiliationMapUnmatched";

function GroupDetail() {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;

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
	} = useAffiliationMapEdit(readOnly);

	let title = "";
	let content: React.ReactNode;
	if (state.action === null) {
		title = "";
		content = (
			<>
				<div className="details-panel-placeholder">{state.message}</div>
				{state.ids.length === 0 && <AffiliationMapUnmatched />}
			</>
		);
	} else {
		title = state.action === "add" ? "Add map" : "Update map";
		content = (
			<>
				<AffiliationMapEntryForm
					action={state.action}
					entry={state.edited}
					hasChanges={hasChanges}
					onChange={onChange}
					submit={submit}
					cancel={cancel}
					readOnly={readOnly}
				/>
				<AffiliationMapMatches map={state.edited} />
			</>
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
						title="Add map"
						disabled={disableAdd}
						active={state.action === "add"}
						onClick={onAdd}
					>
						{" Add"}
					</Button>
					<Button
						variant="outline-danger"
						className="bi-trash"
						title="Delete map"
						disabled={disableDelete}
						onClick={onDelete}
					>
						{" Delete"}
					</Button>
				</div>
			</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}

export default GroupDetail;
