import { Poll } from "@/store/pollingAdmin";
import Editor from "@/components/editor";
import css from "@/components/poll-layout.module.css";

export function PollBodyRow({
	poll,
	changePoll,
	readOnly,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
	readOnly?: boolean;
}) {
	return (
		<div className={css["poll-body-row"]}>
			<Editor
				style={{ width: "100%" }}
				value={poll.body}
				onChange={(body) => changePoll({ body: body || "" })}
				readOnly={readOnly}
			/>
		</div>
	);
}
