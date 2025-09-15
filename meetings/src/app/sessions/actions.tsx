import { useNavigate, useParams } from "react-router";
import { Row, Col, Button } from "react-bootstrap";
import { ConfirmModal, SplitTableButtonGroup } from "@common";

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
		<Row className="w-100 m-3">
			<SplitTableButtonGroup
				selectors={sessionsSelectors}
				actions={sessionsActions}
				columns={tableColumns}
			/>
			<Col className="d-flex justify-content-end align-items-center gap-2">
				<Button
					variant="outline-primary"
					className="bi-cloud-upload"
					title="Import IMAT session"
					onClick={showImatMeetings}
				/>
				<Button
					variant="outline-primary"
					className="bi-trash"
					title="Remove selected"
					disabled={selected.length === 0}
					onClick={handleRemoveSelected}
				/>
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}

export default SessionsActions;
