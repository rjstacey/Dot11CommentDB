import { useNavigate, useParams } from "react-router";

import { ActionButton, Spinner } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectMeetingAttendanceState } from "@/store/imatMeetingAttendance";

import SessionSelectorNav from "@/components/SessionSelectorNav";
import { copyChartToClipboard, downloadChart } from "@/components/copyChart";

function ReportsActions() {
	const navigate = useNavigate();
	const { chart } = useParams();
	const { loading } = useAppSelector(selectMeetingAttendanceState);

	const refresh = () => navigate(0);

	return (
		<div className="top-row">
			<SessionSelectorNav />

			{loading && <Spinner />}

			<div style={{ display: "flex" }}>
				<ActionButton
					name="copy"
					title="Copy chart to clipboard"
					onClick={() => copyChartToClipboard()}
					disabled={!chart}
				/>
				<ActionButton
					name="export"
					title="Export chart"
					//disabled={!showChart}
					onClick={downloadChart}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default ReportsActions;
