import {
	useParams,
	useNavigate,
	useSearchParams,
	useLocation,
} from "react-router";
import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@components/table";

import {
	sessionAttendeesSelectors,
	sessionAttendeesActions,
} from "@/store/sessionAttendees";
import {
	sessionRegistrationActions,
	sessionRegistrationSelectors,
} from "@/store/sessionRegistration";

import { SessionSelectorNav } from "./SessionSelector";
import { tableColumns as sessionAttendeesColumns } from "../tableColumns";
import { tableColumns as sessionRegistrationColumns } from "../registration/tableColumns";
import { refresh } from "../loader";
import { ImportRegistrationDropdown } from "./ImportRegistration";
import { BulkUpdateDropdown } from "./BulkUpdate";
import { ExportAttendanceButton } from "./ExportAttendance";

export function SessionAttendanceActions() {
	const location = useLocation();
	const navigate = useNavigate();
	const params = useParams();
	const groupName = params.groupName!;
	const sessionNumber = Number(params.sessionNumber);
	const [searchParams] = useSearchParams();

	const showRegistration = /registration$/.test(location.pathname);
	const toggleShowRegistration = () => {
		let pathname = "" + sessionNumber;
		if (!showRegistration) pathname += "/registration";
		navigate({ pathname, search: searchParams.toString() });
	};

	const tableSelectors = showRegistration
		? sessionRegistrationSelectors
		: sessionAttendeesSelectors;
	const tableActions = showRegistration
		? sessionRegistrationActions
		: sessionAttendeesActions;
	const tableColumns = showRegistration
		? sessionRegistrationColumns
		: sessionAttendeesColumns;

	return (
		<Row className="w-100 align-items-center">
			<SessionSelectorNav />
			<Col className="d-flex align-items-center gap-2">
				<SplitTableButtonGroup
					selectors={tableSelectors}
					actions={tableActions}
					columns={tableColumns}
				/>
				<BulkUpdateDropdown
					disabled={!sessionNumber || showRegistration}
				/>
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
					className="bi-r-circle"
					title="Show registration"
					disabled={!sessionNumber}
					active={showRegistration}
					onClick={toggleShowRegistration}
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
