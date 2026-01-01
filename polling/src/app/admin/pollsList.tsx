import { Accordion } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminSelectedPollId,
	setSelectedPollId,
	Poll,
} from "@/store/pollingAdmin";

import css from "@/components/poll-list.module.css";

import { PollEditForm } from "./pollEdit";
import { PollSummary } from "./pollSummary";

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

export function PollsList({ polls }: { polls: Poll[] }) {
	const dispatch = useAppDispatch();
	const selectedPollId = useAppSelector(selectPollingAdminSelectedPollId);

	return (
		<Accordion
			className={css["poll-list"]}
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
