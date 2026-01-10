import { Poll } from "@/store/pollingAdmin";

export function PollState({ poll }: { poll: Poll }) {
	let className = "btn show";
	let icon = "";
	let title = "";
	if (poll.state === null && poll.resultsSummary === null) {
		className += " btn-outline-secondary";
		icon = "bi-eye-slash";
		title = "Unshown";
	} else if (poll.state === "shown") {
		className += " btn-outline-primary";
		icon = "bi-eye";
		title = "Shown";
	} else if (poll.state === "opened") {
		className += " btn-outline-success";
		icon = "bi-play";
		title = "Open";
	} else if (poll.state === "closed" || poll.resultsSummary !== null) {
		className += " btn-outline-warning";
		icon = "bi-stop";
		title = "Closed";
	}
	return (
		<div className={className}>
			<i className={icon + " me-2"} />
			{title}
		</div>
	);
}
