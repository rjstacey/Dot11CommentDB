import { Button, Row, Col, ToggleButton } from "react-bootstrap";
import cx from "clsx";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminPolls,
	pollingAdminEventPublish,
	pollingAdminPollCreate,
	defaultMotion,
	defaultStrawpoll,
	Event,
	Poll,
	selectPollingAdminSelectedEvent,
} from "@/store/pollingAdmin";

import { PollsList } from "./pollsList";

import css from "./admin.module.css";

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
				{value ? "Published" : "Unpublished"}
			</ToggleButton>
		</div>
	);
}

function EventActions({ event, polls }: { event: Event; polls: Poll[] }) {
	const dispatch = useAppDispatch();
	const createMotion = () => {
		dispatch(pollingAdminPollCreate(defaultMotion(event, polls)));
	};
	const createStrawpoll = () => {
		dispatch(pollingAdminPollCreate(defaultStrawpoll(event, polls)));
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
					className={cx(polls.length === 0 && "visually-hidden")}
				/>
			</Col>
		</Row>
	);
}

function EventPanel() {
	const event = useAppSelector(selectPollingAdminSelectedEvent);
	const polls = useAppSelector(selectPollingAdminPolls);

	if (!event) return null;

	return (
		<div className={css["event-panel"]}>
			<EventActions event={event} polls={polls} />
			<PollsList polls={polls} />
		</div>
	);
}

export default EventPanel;
