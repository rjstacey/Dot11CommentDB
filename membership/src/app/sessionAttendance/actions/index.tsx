import { useParams, useLocation } from "react-router";
import { Row, Col, Button } from "react-bootstrap";

import { SplitPanelButton, TableColumnSelector } from "@common";
import { SessionSelectorNav } from "./SessionSelectorNav";
import { SessionAttendanceSubmenu } from "./submenu";
import { ImportRegistration } from "./ImportRegistration";
import { Updates } from "./Updates";
import { ExportAttendeesList } from "./ExportAttendeesList";
import { refresh as imatRefresh } from "../attendance/loader";

import {
	tableColumns as imatTableColumns,
	quickSelect as imatQuickSelect,
	selectors as imatTableSelectors,
	actions as imatTableActions,
} from "../attendance/tableColumns";
import {
	tableColumns as regTableColumns,
	selectors as regTableSelectors,
	actions as regTableActions,
} from "../registration/tableColumns";

function useRoute() {
	const { pathname } = useLocation();
	if (/attendance$/i.test(pathname)) return "attendance";
	if (/registration$/i.test(pathname)) return "registration";
	return "";
}

export function SessionAttendanceActions() {
	const params = useParams();
	const groupName = params.groupName!;
	const sessionNumber = Number(params.sessionNumber);

	const route = useRoute();
	let refresh: (() => void) | undefined = undefined;
	let actions: React.ReactElement | undefined = undefined;
	if (route === "attendance") {
		refresh = imatRefresh;
		actions = (
			<>
				<Col xs="auto" className="d-flex justify-content-end align-items-center gap-2">
					<TableColumnSelector
						columns={imatTableColumns}
						selectors={imatTableSelectors}
						actions={imatTableActions}
						quickSelect={imatQuickSelect}
					/>
					<SplitPanelButton
						selectors={imatTableSelectors}
						actions={imatTableActions}
					/>
				</Col>
				<Updates />
				<ExportAttendeesList
					groupName={groupName}
					sessionNumber={sessionNumber}
				/>
			</>
		);
	} else if (route === "registration") {
		actions = (
			<>
				<Col xs="auto" className="d-flex justify-content-end align-items-center gap-2">
					<TableColumnSelector
						columns={regTableColumns}
						selectors={regTableSelectors}
						actions={regTableActions}
					/>
					<SplitPanelButton
						selectors={regTableSelectors}
						actions={regTableActions}
					/>
				</Col>
				<ImportRegistration
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
