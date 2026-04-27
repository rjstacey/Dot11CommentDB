import type { Poll } from "@/store/pollingUser";

export function PollTitleRow({ poll }: { poll: Poll }) {
	return (
		<div className="poll-title-row">
			<h2 className="poll-title">{poll.title}</h2>
		</div>
	);
}
