import { useParams, useLocation } from "react-router";
import { Row, Button } from "react-bootstrap";

import { SplitTableButtonGroup } from "@common";
import { SessionSelectorNav } from "./SessionSelectorNav";
import { SessionAttendanceSubmenu } from "./submenu";
import { ImportRegistration } from "./ImportRegistration";
import { UpdateFromImatAttendance } from "./UpdateFromImatAttendance";
import { UpdateSummary } from "./UpdateSummary";
import { ExportAttendeesList } from "./ExportAttendeesList";
import { refresh as imatRefresh } from "../imat/loader";
import { refresh as summaryRefresh } from "../summary/loader";

import {
	tableColumns as imatTableColumns,
	selectors as imatTableSelectors,
	actions as imatTableActions,
} from "../imat/tableColumns";
import {
	tableColumns as regTableColumns,
	selectors as regTableSelectors,
	actions as regTableActions,
} from "../registration/tableColumns";
import {
	tableColumns as summaryTableColumns,
	selectors as summaryTableSelectors,
	actions as summaryTableActions,
} from "../summary/tableColumns";

function useRoute() {
	const { pathname } = useLocation();
	if (/imat$/i.test(pathname)) return "imat";
	if (/registration$/i.test(pathname)) return "registration";
	if (/summary$/i.test(pathname)) return "summary";
	return "";
}

export function SessionAttendanceActions() {
	const params = useParams();
	const groupName = params.groupName!;
	const sessionNumber = Number(params.sessionNumber);

	const route = useRoute();
	let refresh: (() => void) | undefined = undefined;
	let actions: JSX.Element | undefined = undefined;
	if (route === "imat") {
		refresh = imatRefresh;
		actions = (
			<>
				<SplitTableButtonGroup
					xs="auto"
					className="ms-auto"
					selectors={imatTableSelectors}
					actions={imatTableActions}
					columns={imatTableColumns}
				/>
				<UpdateFromImatAttendance />
			</>
		);
	} else if (route === "registration") {
		actions = (
			<>
				<SplitTableButtonGroup
					xs="auto"
					className="ms-auto"
					selectors={regTableSelectors}
					actions={regTableActions}
					columns={regTableColumns}
				/>
				<ImportRegistration
					groupName={groupName}
					sessionNumber={sessionNumber}
				/>
			</>
		);
	} else if (route === "summary") {
		refresh = summaryRefresh;
		actions = (
			<>
				<SplitTableButtonGroup
					xs="auto"
					className="ms-auto"
					selectors={summaryTableSelectors}
					actions={summaryTableActions}
					columns={summaryTableColumns}
				/>
				<UpdateSummary />
				<ExportAttendeesList
					groupName={groupName}
					sessionNumber={sessionNumber}
				/>
			</>
		);
	}

	return (
		<Row className="w-100 d-flex justify-content-end align-items-center m-3">
			<SessionSelectorNav />
			{sessionNumber && (
				<>
					<SessionAttendanceSubmenu />
					<div className="col d-flex align-items-center gap-2 ms-3">
						{actions}
						<Button
							variant="outline-primary"
							className="bi-arrow-repeat"
							title="Refresh"
							onClick={refresh}
							disabled={!refresh}
						/>
					</div>
				</>
			)}
		</Row>
	);
}
