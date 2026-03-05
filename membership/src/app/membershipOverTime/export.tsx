import { Button } from "react-bootstrap";
import { useAppDispatch } from "@/store/hooks";
import { exportMembershipOverTime } from "@/store/membershipOverTime";

export function MembershipOverTimeExport() {
	const dispatch = useAppDispatch();

	async function handleExport() {
		await dispatch(exportMembershipOverTime());
	}

	return (
		<Button variant="light" onClick={handleExport}>
			Export
		</Button>
	);
}
