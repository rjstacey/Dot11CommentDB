import { useAppDispatch } from "@/store/hooks";
import { Poll, pollingAdminPollAction } from "@/store/pollingAdmin";
import { usePollEdit } from "@/hooks/pollEdit";
import { PollShow } from "./PollShow";
import { PollTypeSelect } from "./PollTypeSelect";
import { PollRecordSelect } from "./PollRecordSelect";
import { PollTitleRow } from "./PollTitleRow";
import { PollBodyRow } from "./PollBodyRow";
import { PollActions } from "./PollActions";
import { PollOptionsRow } from "./PollOptionsRow";
import { PollMovedSecondedRow } from "./PollMovedSecondedRow";

import css from "./PollEdit.module.css";

export function PollEditForm({ poll }: { poll: Poll }) {
	const dispatch = useAppDispatch();
	const { edited, onChange } = usePollEdit(poll);

	const disabled = poll.state === "opened" || poll.state === "closed";

	function setShowPoll(show: boolean) {
		dispatch(pollingAdminPollAction(edited.id, show ? "show" : "unshow"));
	}

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
					<PollShow
						className={css.topRowItem}
						value={Boolean(edited.state)}
						onChange={setShowPoll}
						disabled={
							edited.state === "opened" ||
							edited.state === "closed"
						}
					/>
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
				<PollMovedSecondedRow poll={edited} changePoll={onChange} />
			)}
			<PollActions poll={edited} />
		</>
	);
}
