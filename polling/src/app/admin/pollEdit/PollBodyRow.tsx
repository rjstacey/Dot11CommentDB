import { Poll } from "@/store/pollingAdmin";
import Editor from "@/components/editor";
import css from "./PollEdit.module.css";

export function PollBodyRow({
	poll,
	changePoll,
	disabled,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
	readOnly?: boolean;
	disabled?: boolean;
}) {
	return (
		<div className={css.pollBodyRow} style={{ position: "relative" }}>
			<Editor
				style={{ width: "100%" }}
				value={poll.body}
				onChange={(body) => changePoll({ body: body || "" })}
				readOnly={disabled}
			/>
		</div>
	);
}
