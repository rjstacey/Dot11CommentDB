import { useAppSelector } from "@/store/hooks";
import { selectPollingAdminVoted } from "@/store/pollingAdmin";

export function MemberCount() {
	const { numMembers } = useAppSelector(selectPollingAdminVoted);

	return (
		<div>
			<i className="bi-people me-2" />
			<span>{numMembers}</span>
		</div>
	);
}
