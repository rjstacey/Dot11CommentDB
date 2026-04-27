import { Accordion } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingUserPolls,
	selectPollingUserSelectedPollId,
	setSelectedPollId,
	Poll,
} from "@/store/pollingUser";

import { PollDetail } from "./PollDetail";
import { PollSummary } from "../../admin/pollSummary";

function PollEntry({ poll, isSelected }: { poll: Poll; isSelected: boolean }) {
	return (
		<Accordion.Item eventKey={poll.id.toString()} className="poll-item">
			<Accordion.Header>
				{!isSelected && <PollSummary poll={poll} className="summary" />}
			</Accordion.Header>
			<Accordion.Body>
				{isSelected && <PollDetail poll={poll} />}
			</Accordion.Body>
		</Accordion.Item>
	);
}

export function PollsList() {
	const dispatch = useAppDispatch();
	const polls = useAppSelector(selectPollingUserPolls);
	const pollId = useAppSelector(selectPollingUserSelectedPollId);
	const setActiveKey = (eventKey?: string | string[] | null) =>
		dispatch(setSelectedPollId(eventKey ? Number(eventKey) : null));

	return (
		<Accordion
			className="poll-list"
			activeKey={pollId?.toString()}
			onSelect={setActiveKey}
		>
			{polls.map((poll) => (
				<PollEntry
					key={poll.id}
					poll={poll}
					isSelected={pollId === poll.id}
				/>
			))}
		</Accordion>
	);
}
