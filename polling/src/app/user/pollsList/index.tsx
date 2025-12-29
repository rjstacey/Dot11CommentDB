import { Accordion } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingUserPolls,
	selectPollingUserSelectedPollId,
	setSelectedPollId,
	Poll,
} from "@/store/pollingUser";

import css from "./allPolls.module.css";

import { PollEditForm } from "../../admin/pollEdit";
import { PollSummary } from "../../admin/pollSummary";

function PollEntry({ poll, isSelected }: { poll: Poll; isSelected: boolean }) {
	return (
		<Accordion.Item eventKey={poll.id.toString()} className={css.item}>
			<Accordion.Header>
				{!isSelected && <PollSummary poll={poll} className="summary" />}
			</Accordion.Header>
			<Accordion.Body>
				{isSelected && <PollEditForm poll={poll} />}
			</Accordion.Body>
		</Accordion.Item>
	);
}

export function PollsList() {
	const dispatch = useAppDispatch();
	const polls = useAppSelector(selectPollingUserPolls);
	const selectedPollId = useAppSelector(selectPollingUserSelectedPollId);

	return (
		<Accordion
			className={css.pollAccordion}
			activeKey={selectedPollId?.toString()}
			onSelect={(eventKey) =>
				dispatch(
					setSelectedPollId(
						typeof eventKey === "string" ? parseInt(eventKey) : null
					)
				)
			}
		>
			{polls.map((poll) => (
				<PollEntry
					key={poll.id}
					poll={poll}
					isSelected={selectedPollId === poll.id}
				/>
			))}
		</Accordion>
	);
}
