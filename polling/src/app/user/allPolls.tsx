import { useAppSelector } from "@/store/hooks";
import {
	selectPollingUserEvent,
	selectPollingUserPolls,
	Poll,
} from "@/store/pollingUser";
import css from "./allPolls.module.css";
import editorCss from "@/components/editor/editor.module.css";

function PollEntry({ poll }: { poll: Poll }) {
	return (
		<div className={css.pollRow}>
			<div className={css.pollEntry}>
				<span>{poll.title}</span>
				<div
					className={editorCss.bodyContainer}
					dangerouslySetInnerHTML={{ __html: poll.body }}
				/>
			</div>
		</div>
	);
}

function AllPolls() {
	const event = useAppSelector(selectPollingUserEvent);
	const polls = useAppSelector(selectPollingUserPolls);

	if (!event) return null;

	return (
		<div className={css.body}>
			<div className={css.pollTable}>
				{polls.map((poll) => (
					<PollEntry key={poll.id} poll={poll} />
				))}
			</div>
		</div>
	);
}

export default AllPolls;
