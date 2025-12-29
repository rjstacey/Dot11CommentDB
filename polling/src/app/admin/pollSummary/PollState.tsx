export function PollState({ state }: { state: string | null }) {
	const style = { opacity: 0.5 };
	if (state === "shown") {
		return (
			<div className="btn btn-outline-success show" style={style}>
				<i className="bi-eye me-2" />
				{"Shown"}
			</div>
		);
	}
	if (state === "opened") {
		return (
			<div className="btn btn-outline-success show" style={style}>
				<i className="bi-play me-2" />
				{"Open"}
			</div>
		);
	}
	if (state === "closed") {
		return (
			<div className="btn btn-outline-warning show" style={style}>
				<i className="bi-stop me-2" />
				{"Closed"}
			</div>
		);
	}

	return null;
}
