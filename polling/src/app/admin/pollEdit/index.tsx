import type { Poll } from "@/store/pollingAdmin";
import { usePollEdit } from "@/hooks/pollEdit";
import { PollTypeSelect } from "./PollTypeSelect";
import { PollRecordSelect } from "./PollRecordSelect";
import { PollActivate } from "./PollActivate";
import { PollState } from "../pollSummary/PollState";
import { PollTitleRow } from "./PollTitleRow";
import { PollBodyRow } from "./PollBodyRow";
import { PollOptionsRow } from "./PollOptionsRow";
import { PollMovedRow } from "./PollMovedRow";
import { PollActions } from "./PollActions";

import css from "./PollEdit.module.css";

export function PollEditForm({ poll }: { poll: Poll }) {
	const { edited, onChange, onAction, onDelete } = usePollEdit(poll);

	const disabled = poll.state === "opened" || poll.state === "closed";

	return (
		<>
			<div className={css.topRow}>
				<div className={css.topRowGroup}>
					<PollTypeSelect
						className={css.topRowItem}
						value={edited.type}
						onChange={(type) => onChange({ type })}
						disabled={disabled}
					/>

					<PollRecordSelect
						className={css.topRowItem}
						value={edited.recordType}
						onChange={(recordType) => onChange({ recordType })}
						disabled={disabled}
					/>
				</div>
				<div className={css.topRowGroup}>
					<PollActivate
						className={css.topRowItem}
						value={Boolean(edited.state)}
						onChange={(activate) =>
							onAction(activate ? "show" : "unshow")
						}
						disabled={edited.state === "opened"}
					/>
					<span className="me-2">This poll is:</span>
					<PollState state={edited.state} />
				</div>
			</div>
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
