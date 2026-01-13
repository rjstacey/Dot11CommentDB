import type { Poll } from "@/store/pollingAdmin";
import { usePollEdit } from "@/hooks/pollEdit";
import { PollTypeStatusRow } from "./PollTypeStatusRow";
import { PollTitleRow } from "./PollTitleRow";
import { PollBodyRow } from "./PollBodyRow";
import { PollOptionsRow } from "./PollOptionsRow";
import { PollMovedRow } from "./PollMovedRow";
import { PollActions } from "./PollActions";

export function PollEditForm({ poll }: { poll: Poll }) {
	const readOnly =
		poll.state === "opened" ||
		poll.state === "closed" ||
		poll.resultsSummary !== null;

	const { edited, onChange, onAction, onDelete } = usePollEdit(
		poll,
		readOnly
	);

	return (
		<>
			<PollTypeStatusRow
				poll={edited}
				changePoll={onChange}
				readOnly={readOnly}
			/>
			<PollTitleRow
				value={edited.title}
				onChange={(title) => onChange({ title })}
				readOnly={readOnly}
			/>
			<PollBodyRow
				poll={edited}
				changePoll={onChange}
				readOnly={readOnly}
			/>
			<PollOptionsRow
				poll={edited}
				changePoll={onChange}
				readOnly={readOnly}
			/>
			{edited.type === "m" && (
				<PollMovedRow
					poll={edited}
					changePoll={onChange}
					readOnly={readOnly}
				/>
			)}
			<PollActions
				poll={edited}
				onAction={onAction}
				onDelete={onDelete}
			/>
		</>
	);
}
