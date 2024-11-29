import React from "react";
import {
	Button,
	Form,
	Row,
	Dropdown,
	DropdownRendererProps,
	Field,
	Input,
} from "dot11-components";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import {
	pollingAdminAddPoll,
	selectPollingAdminEventId,
} from "../store/pollingAdmin";
import { PollCreate } from "../schemas/poll";

function useNullPoll() {
	const eventId = useAppSelector(selectPollingAdminEventId)!;
	return React.useMemo(() => {
		const poll: PollCreate = {
			eventId,
			title: "",
			body: "",
		};
		return poll;
	}, [eventId]);
}

function CreatePollForm({ methods }: DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const nullPoll = useNullPoll();
	const [poll, setPoll] = React.useState<PollCreate>(nullPoll);
	const [errorText, setErrorText] = React.useState<string | undefined>();

	function CheckPoll(poll: PollCreate) {
		if (!poll.title) {
			setErrorText("Title not set");
			return;
		}
		setErrorText(undefined);
	}

	function changePoll(changes: Partial<PollCreate>) {
		const updatePoll = { ...poll, ...changes };
		CheckPoll(updatePoll);
		setPoll(updatePoll);
	}

	async function submit() {
		if (errorText) return;
		await dispatch(pollingAdminAddPoll(poll));
		methods.close();
	}

	return (
		<Form
			style={{ width: 300 }}
			title="Add Poll"
			submitLabel="Add"
			submit={submit}
			cancel={methods.close}
			errorText={errorText}
		>
			<Row>
				<Field label="Title:">
					<Input
						type="text"
						value={poll.title}
						onChange={(e) => changePoll({ title: e.target.value })}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Body:">
					<Input
						type="text"
						value={poll.body}
						onChange={(e) => changePoll({ body: e.target.value })}
					/>
				</Field>
			</Row>
		</Form>
	);
}

function CreatePollDropdown() {
	return (
		<Dropdown
			handle={false}
			selectRenderer={({
				props,
				state,
				methods,
			}: DropdownRendererProps) => (
				<Button
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						fontSize: 10,
						fontWeight: 700,
					}}
					title="Export a list of voters"
					isActive={state.isOpen}
					onClick={state.isOpen ? methods.close : methods.open}
				>
					<span>Add</span>
					<span>Poll</span>
				</Button>
			)}
			dropdownRenderer={(props) => <CreatePollForm {...props} />}
		/>
	);
}

export default CreatePollDropdown;
