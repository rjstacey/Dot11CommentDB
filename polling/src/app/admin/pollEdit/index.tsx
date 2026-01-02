import type { Poll } from "@/store/pollingAdmin";
import { usePollEdit } from "@/hooks/pollEdit";
import { PollTypeStatusRow } from "./PollTypeStatusRow";
import { PollTitleRow } from "./PollTitleRow";
import { PollBodyRow } from "./PollBodyRow";
import { PollOptionsRow } from "./PollOptionsRow";
import { PollMovedRow } from "./PollMovedRow";
import { PollActions } from "./PollActions";

export function PollEditForm({ poll }: { poll: Poll }) {
	const { edited, onChange, onAction, onDelete } = usePollEdit(poll);

	const disabled = poll.state === "opened" || poll.state === "closed";

	return (
		<>
			<PollTypeStatusRow
				poll={edited}
				changePoll={onChange}
				disabled={disabled}
			/>
			<PollTitleRow
				value={edited.title}
				onChange={(title) => onChange({ title })}
				disabled={disabled}
			/>
			<PollBodyRow
				poll={edited}
				changePoll={onChange}
				disabled={disabled}
			/>
			<PollOptionsRow
				poll={edited}
				changePoll={onChange}
				disabled={disabled}
			/>
			{edited.type === "m" && (
				<PollMovedRow poll={edited} changePoll={onChange} />
			)}
			<PollActions
				poll={edited}
				onAction={onAction}
				onDelete={onDelete}
			/>
		</>
	);
}
