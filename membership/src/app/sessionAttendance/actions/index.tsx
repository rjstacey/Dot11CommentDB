import {
	useParams,
	useNavigate,
	useSearchParams,
	useLocation,
} from "react-router";
import { Form, Row, Col, Spinner, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@components/table";

import { useAppSelector } from "@/store/hooks";
import {
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	selectSessionAttendeesState,
} from "@/store/sessionAttendees";
import {
	sessionRegistrationActions,
	sessionRegistrationSelectors,
} from "@/store/sessionRegistration";

import { copyChartToClipboard, downloadChart } from "@/components/copyChart";
import { SessionSelector } from "./SessionSelector";
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
	const [searchParams] = useSearchParams();
	const useDaily =
		searchParams.has("useDaily") &&
		searchParams.get("useDaily") !== "false";

	const { loading } = useAppSelector(selectSessionAttendeesState);

	const toggleUseDaily = () => {
		if (useDaily) searchParams.delete("useDaily");
		else searchParams.append("useDaily", "true");
		navigate({ search: searchParams.toString() });
	};

	const showChart = /chart$/.test(location.pathname);
	const toggleShowChart = () => {
		let pathname = "" + sessionNumber;
		if (!showChart) pathname += "/chart";
		navigate({ pathname, search: searchParams.toString() });
	};

	const showRegistration = /registration$/.test(location.pathname);
	const toggleShowRegistration = () => {
		let pathname = "" + sessionNumber;
		if (!showRegistration) pathname += "/registration";
		navigate({ pathname, search: searchParams.toString() });
	};

	const sessionNumber = Number(params.sessionNumber);
	const setSessionNumber = (sessionNumber: number | null) => {
		let pathname = "";
		if (sessionNumber) {
			pathname += sessionNumber;
			if (showChart) pathname += "/chart";
		}
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
			<Col xs="auto">
				<SessionSelector
					value={sessionNumber}
					onChange={setSessionNumber}
				/>
			</Col>
			<Col className="d-flex flex-column">
				<Form.Group
					controlId="useDaily"
					className="d-flex align-items-center gap-2"
				>
					<Form.Check
						checked={useDaily}
						onChange={toggleUseDaily}
						disabled={loading}
					/>
					<Form.Label>Daily attendance</Form.Label>
				</Form.Group>
				<Form.Group
					controlId="not_useDaily"
					className="d-flex align-items-center gap-2"
				>
					<Form.Check
						checked={!useDaily}
						onChange={toggleUseDaily}
						disabled={loading}
					/>
					<Form.Label>Attendance summary</Form.Label>
				</Form.Group>
			</Col>
			<Col>{loading && <Spinner animation="border" />}</Col>
			<Col className="d-flex align-items-center gap-2">
				<SplitTableButtonGroup
					selectors={tableSelectors}
					actions={tableActions}
					columns={tableColumns}
				/>
				<BulkUpdateDropdown
					disabled={!sessionNumber || showChart || showRegistration}
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
					className="bi-bar-chart-line"
					title="Chart attendance"
					disabled={!sessionNumber}
					active={showChart}
					onClick={toggleShowChart}
				/>
				<Button
					variant="outline-primary"
					className="bi-copy"
					title="Copy chart to clipboard"
					disabled={!showChart}
					onClick={() => copyChartToClipboard()}
				/>
				<Button
					variant="outline-primary"
					className="bi-cloud-download"
					title="Export chart"
					disabled={!showChart}
					onClick={downloadChart}
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
