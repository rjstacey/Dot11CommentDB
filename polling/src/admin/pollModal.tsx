import React from "react";
import { AppModal, Form, Row, Button } from "dot11-components";
import { Poll } from "../schemas/poll";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	pollingAdminOpenPoll,
	pollingAdminClosePoll,
	pollingAdminSelectPoll,
	pollingAdminUpdatePoll,
	selectPollAdminPoll,
} from "../store/pollingAdmin";
import Editor from "../editor/Editor";

function PollForm({ poll, close }: { poll: Poll; close: () => void }) {
	const dispatch = useAppDispatch();
	const [title, setTitle] = React.useState(poll.title);
	const [body, setBody] = React.useState(poll.body);

	function startPoll() {
		dispatch(pollingAdminOpenPoll(poll.id));
	}

	function stopPoll() {
		dispatch(pollingAdminClosePoll(poll.id));
	}

	function changeTitle(title: string) {
		setTitle(title);
		dispatch(pollingAdminUpdatePoll({ id: poll.id, changes: { title } }));
	}

	function changeBody(body: string) {
		setBody(body);
		dispatch(pollingAdminUpdatePoll({ id: poll.id, changes: { body } }));
	}

	return (
		<>
			<Row>
				<Button onClick={startPoll}>Start</Button>
				<Button onClick={stopPoll}>Stop</Button>
				<Button onClick={close}>Close</Button>
			</Row>
			<Form>
				<Editor
					subject={title}
					body={body}
					onChangeSubject={changeTitle}
					onChangeBody={changeBody}
					preview={false}
				/>
			</Form>
		</>
	);
}

function PollModal() {
	const dispatch = useAppDispatch();
	const poll = useAppSelector(selectPollAdminPoll);
	function close() {
		dispatch(pollingAdminSelectPoll(null));
	}
	return (
		<AppModal isOpen={Boolean(poll)} onRequestClose={close}>
			{poll && <PollForm poll={poll} close={close} />}
		</AppModal>
	);
}

export default PollModal;
