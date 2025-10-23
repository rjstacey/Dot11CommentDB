import { Form, Row, Col } from "react-bootstrap";
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
import css from "./activePoll.module.css";

function PollOptions({ poll }: { poll: Poll }) {
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
		<div className={css.pollOptionsContainer}>
			<div className={css.pollOptions}>
				{poll.options.map((o, i) => {
					const id = `pollOption-${i}`;
					return (
						<div key={id} className={css.pollOption}>
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
			<div className={css.pollOptionsSubmit}>
				<button onClick={submitVote} disabled={poll.state !== "opened"}>
					Submit
				</button>
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
			<div className={css.pollTitleRow}>
				<h2>{poll.title}</h2>
			</div>
			<div className={css.pollBodyRow}>
				<div dangerouslySetInnerHTML={{ __html: poll.body }} />
			</div>
			<div className={css.pollOptionsRow}>
				<PollOptions poll={poll} />
			</div>
			{poll.type === "m" && (
				<Form.Group
					as={Row}
					className="mb-3"
					controlId="formMovedSeconded"
				>
					<Col>
						<Form.Label htmlFor="moved">Moved:</Form.Label>
						<MemberShow id="moved" sapin={poll.movedSAPIN} />
					</Col>
					<Col>
						<Form.Label htmlFor="seconded">Seconded:</Form.Label>
						<MemberShow id="seconded" sapin={poll.secondedSAPIN} />
					</Col>
				</Form.Group>
			)}
		</>
	);
}

function CurrentPoll() {
	const poll = useAppSelector(selectPollingUserActivePoll);

	if (!poll) return null;

	return <PollForm poll={poll} />;
}

export default CurrentPoll;
