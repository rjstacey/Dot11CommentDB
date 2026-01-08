export function PollState({ state }: { state: string | null }) {
	let className = "btn show";
	let icon = "";
	let title = "";
	if (state === "opened") {
		className += " btn-outline-success";
		icon = "bi-play";
		title = "Open";
	} else if (state === "closed") {
		className += " btn-outline-warning";
		icon = "bi-stop";
		title = "Closed";
	} else {
		className += " btn-light";
		icon = "";
		title = "";
	}
	return (
		<div className={className}>
			<i className={icon + " me-2"} />
			{title}
		</div>
	);
}
