import type { Poll } from "@/store/pollingUser";
import css from "../poll-layout.module.css";

export function PollTitleRow({ poll }: { poll: Poll }) {
	return (
		<div className={css["poll-title-row"]}>
			<h2 className={css["poll-title"]}>{poll.title}</h2>
		</div>
	);
}
