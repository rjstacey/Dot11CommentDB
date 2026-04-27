import type { Poll } from "@/store/pollingUser";

export function PollBodyRow({ poll }: { poll: Poll }) {
	return (
		<div
			className="poll-body-row"
			dangerouslySetInnerHTML={{ __html: poll.body }}
		/>
	);
}
