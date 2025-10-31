import { useParams, useLocation } from "react-router";
import { Button } from "react-bootstrap";

import { SessionAttendanceSubmenu } from "../submenu";
import { ImportRegistrationDropdown } from "./ImportRegistration";
import { BulkUpdateDropdown } from "./BulkUpdate";
import { ExportAttendanceButton } from "./ExportAttendance";
import { refresh as imatRefresh } from "../imat/loader";
import { refresh as summaryRefresh } from "../summary/loader";

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
	if (route === "imat") refresh = imatRefresh;
	if (route === "summary") refresh = summaryRefresh;

	return (
		<>
			<SessionAttendanceSubmenu style={{ order: 2 }} />
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
					disabled={!refresh}
				/>
			</div>
		</>
	);
}
