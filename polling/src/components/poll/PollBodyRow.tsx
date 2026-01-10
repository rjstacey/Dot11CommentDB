import type { Poll } from "@/store/pollingUser";
import css from "@/components/poll-layout.module.css";

export function PollBodyRow({ poll }: { poll: Poll }) {
	return (
		<div
			className={css["poll-body-row"]}
			dangerouslySetInnerHTML={{ __html: poll.body }}
		/>
	);
}
