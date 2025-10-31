import { Button } from "react-bootstrap";
import { useAppDispatch } from "@/store/hooks";
import { exportAttendanceForMinutes } from "@/store/attendanceSummaries";

export function ExportAttendanceButton({
	groupName,
	sessionNumber,
}: {
	groupName: string | null;
	sessionNumber: number | null;
}) {
	const dispatch = useAppDispatch();
	const onClick = () =>
		dispatch(exportAttendanceForMinutes(groupName!, sessionNumber!));
	return (
		<Button
			variant="outline-primary"
			title="Download attendance for minutes"
			disabled={!groupName || !sessionNumber}
			onClick={onClick}
			className="text-nowrap"
		>
			<i className="bi-cloud-download" /> for minutes
		</Button>
	);
}
