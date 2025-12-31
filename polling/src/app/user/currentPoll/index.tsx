import { Form, Button } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
	Poll,
	pollingUserSubmitVote,
	selectPollingUserActivePoll,
	selectPollingUserState,
	setPollVotes,
	PollChoice,
} from "@/store/pollingUser";
import MemberShow from "@/components/MemberShow";
import css from "@/components/poll-layout.module.css";

function PollOptionsRow({ poll }: { poll: Poll }) {
	const dispatch = useAppDispatch();

	const { submitMsg, pollVotes } = useAppSelector(selectPollingUserState);

	function toggleVote(index: number) {
		let newVotes = pollVotes.slice();
		if (poll.choice === PollChoice.MULTIPLE) {
			const i = newVotes.indexOf(index);
			if (i >= 0) newVotes.splice(i, 1);
			else newVotes.push(index);
		} else {
			newVotes = [index];
		}
		dispatch(setPollVotes(newVotes));
	}

	function submitVote() {
		dispatch(pollingUserSubmitVote());
	}

	return (
		<div className={css["poll-options-row"]}>
			<div className={css["poll-options-col1"]}>
				{poll.options.map((o, i) => {
					const id = `poll-option-${i}`;
					return (
						<div key={id} className={css["poll-option"]}>
							<Form.Check
								id={id}
								checked={pollVotes.includes(i)}
								onChange={() => toggleVote(i)}
							/>
							<label htmlFor={id}>{o}</label>
						</div>
					);
				})}
			</div>
			<div className={css["poll-options-col2"]}>
				<Button
					variant="outline-primary"
					onClick={submitVote}
					disabled={poll.state !== "opened"}
				>
					{"Submit"}
				</Button>
				<span>{submitMsg}&nbsp;</span>
			</div>
		</div>
	);
}

function PollState({ poll }: { poll: Poll }) {
	return <div>State: {poll.state}</div>;
}

function PollForm({ poll }: { poll: Poll }) {
	return (
		<>
			<PollState poll={poll} />
			<div className={css["poll-title-row"]}>
				<h2 className={css["poll-title"]}>{poll.title}</h2>
			</div>
			<div className={css["poll-body-row"]}>
				<div dangerouslySetInnerHTML={{ __html: poll.body }} />
			</div>
			<PollOptionsRow poll={poll} />
			{poll.type === "m" && (
				<div className={css["poll-moved-row"]}>
					<div className={css["poll-moved-col"]}>
						<span>Moved:</span>
						<MemberShow id="moved" sapin={poll.movedSAPIN} />
					</div>
					<div className={css["poll-moved-col"]}>
						<span>Seconded:</span>
						<MemberShow id="seconded" sapin={poll.secondedSAPIN} />
					</div>
				</div>
			)}
		</>
	);
}

export function CurrentPoll() {
	const poll = useAppSelector(selectPollingUserActivePoll);

	if (!poll) return null;

	return <PollForm poll={poll} />;
}
