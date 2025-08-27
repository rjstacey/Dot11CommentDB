import { useParams } from "react-router";
import { Button } from "react-bootstrap";

import { SessionSelectorNav } from "./SessionSelector";
import { refresh } from "../loader";
import { ImportRegistrationDropdown } from "./ImportRegistration";
import { BulkUpdateDropdown } from "./BulkUpdate";
import { ExportAttendanceButton } from "./ExportAttendance";

export function SessionAttendanceActions() {
	const params = useParams();
	const groupName = params.groupName!;
	const sessionNumber = Number(params.sessionNumber);

	return (
		<>
			<SessionSelectorNav style={{ order: 1 }} />
			<div
				style={{ order: 4 }}
				className="d-flex justify-content-end align-items-center justify-self-stretch m-3 gap-2"
			>
				<BulkUpdateDropdown disabled={!sessionNumber} />
				<ImportRegistrationDropdown
					groupName={groupName}
					sessionNumber={sessionNumber}
				/>
				<ExportAttendanceButton
					groupName={groupName}
					sessionNumber={sessionNumber}
				/>
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</>
	);
}
