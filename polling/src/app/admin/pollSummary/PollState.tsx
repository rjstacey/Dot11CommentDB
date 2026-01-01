export function PollState({
	state,
	muted,
}: {
	state: string | null;
	muted?: boolean;
}) {
	let className = "btn show";
	let icon = "";
	let title = "";
	if (state === null) {
		className += " btn-light";
		icon = "bi-eye-slash";
		title = "Unshown";
	} else if (state === "shown") {
		className += " btn-outline-primary";
		icon = "bi-eye";
		title = "Shown";
	} else if (state === "opened") {
		className += " btn-outline-success";
		icon = "bi-play";
		title = "Open";
	} else if (state === "closed") {
		className += " btn-outline-warning";
		icon = "bi-stop";
		title = "Closed";
	}
	if (muted) {
		if (state === null) return null;
		className += " opacity-50";
	}
	return (
		<div className={className}>
			<i className={icon + " me-2"} />
			{title}
		</div>
	);
}
