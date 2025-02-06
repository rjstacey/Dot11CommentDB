import { useNavigate, useParams } from "react-router";

import {
	TableColumnSelector,
	ButtonGroup,
	TableViewSelector,
	SplitPanelButton,
	ActionButton,
	ConfirmModal,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	deleteSessions,
	selectSessionsState,
	sessionsSelectors,
	sessionsActions,
} from "@/store/sessions";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";

function SessionsActions() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { groupName } = useParams();
	const { selected } = useAppSelector(selectSessionsState);
	const showImatMeetings = () => navigate(`/${groupName}/imatMeetings`);
	const handleRemoveSelected = async () => {
		if (selected.length) {
			const ok = await ConfirmModal.show(
				"Are you sure you want to delete " + selected.join(", ") + "?"
			);
			if (ok) await dispatch(deleteSessions(selected));
		}
	};
	return (
		<div className="control-group">
			<ButtonGroup className="button-group">
				<div>Table view</div>
				<div style={{ display: "flex" }}>
					<TableViewSelector
						selectors={sessionsSelectors}
						actions={sessionsActions}
					/>
					<TableColumnSelector
						selectors={sessionsSelectors}
						actions={sessionsActions}
						columns={tableColumns}
					/>
					<SplitPanelButton
						selectors={sessionsSelectors}
						actions={sessionsActions}
					/>
				</div>
			</ButtonGroup>
			<ActionButton
				name="import"
				title="Import IMAT session"
				onClick={showImatMeetings}
			/>
			<ActionButton
				name="delete"
				title="Remove selected"
				disabled={selected.length === 0}
				onClick={handleRemoveSelected}
			/>
			<ActionButton name="refresh" title="Refresh" onClick={refresh} />
		</div>
	);
}

export default SessionsActions;
