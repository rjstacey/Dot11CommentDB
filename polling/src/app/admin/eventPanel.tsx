import { Accordion, Button, Row, Col, ToggleButton } from "react-bootstrap";
import cx from "classnames";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminPolls,
	selectPollingAdminSelectedPollId,
	setSelectedPollId,
	pollingAdminEventPublish,
	pollingAdminAddPoll,
	defaultMotion,
	defaultStrawpoll,
	Event,
	Poll,
} from "@/store/pollingAdmin";

import css from "./eventPanel.module.css";

import { PollEditForm } from "./PollEditForm";
import { PollSummary } from "./PollSummary";

function EventShow({
	value,
	onChange,
	disabled,
	className,
}: {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<div className={cx("d-flex align-items-center me-3", className)}>
			<span className="me-2">These polls are:</span>
			<ToggleButton
				type="checkbox"
				name="event-show"
				id="event-show"
				value="shown"
				variant={"outline-success"}
				checked={value}
				onChange={(e) => onChange(e.target.checked)}
				disabled={disabled}
			>
				<i className={cx(value ? "bi-eye" : "bi-eye-slash", "me-2")} />
				{value ? "Published" : "Hidden"}
			</ToggleButton>
		</div>
	);
}

function EventActions({ event, polls }: { event: Event; polls: Poll[] }) {
	const dispatch = useAppDispatch();
	const createMotion = () => {
		dispatch(pollingAdminAddPoll(defaultMotion(event, polls)));
	};
	const createStrawpoll = () => {
		dispatch(pollingAdminAddPoll(defaultStrawpoll(event, polls)));
	};
	const setIsPublished = (value: boolean) => {
		dispatch(pollingAdminEventPublish(event.id, value));
	};

	return (
		<Row className="m-2">
			<Col className="d-flex justify-content-end gap-2">
				<Button variant="light" onClick={createMotion}>
					<i className="bi-plus-lg me-2" />
					{"Motion"}
				</Button>
				<Button variant="light" onClick={createStrawpoll}>
					<i className="bi-plus-lg me-2" />
					{"Strawpoll"}
				</Button>
				<EventShow
					value={event.isPublished}
					onChange={setIsPublished}
				/>
			</Col>
		</Row>
	);
}

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

function EventPolls({ polls }: { polls: Poll[] }) {
	const dispatch = useAppDispatch();
	const selectedPollId = useAppSelector(selectPollingAdminSelectedPollId);

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

function EventPanel({ event }: { event: Event }) {
	const polls = useAppSelector(selectPollingAdminPolls);

	if (!event) return null;

	return (
		<>
			<EventActions event={event} polls={polls} />
			<EventPolls polls={polls} />
		</>
	);
}

export default EventPanel;
