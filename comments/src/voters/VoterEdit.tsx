import * as React from "react";

import {
	Form,
	Row,
	Field,
	Select,
	shallowDiff,
	AppModal,
	Checkbox,
} from "dot11-components";

import MemberSelector from "./MemberSelector";

import { useAppDispatch } from "../store/hooks";
import { VoterCreate, addVoter, updateVoter } from "../store/voters";

const statusOptions = [
	{ value: "Voter", label: "Voter" },
	{ value: "ExOfficio", label: "ExOfficio" },
];

function VoterEditForm({
	voter,
	action,
	close,
}: {
	voter: VoterCreate;
	action: "add" | "update" | null;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [state, setState] = React.useState(voter);
	const [errMsg, setErrMsg] = React.useState("");

	React.useEffect(() => setState(voter), [voter]);

	function changeState(changes: Partial<VoterCreate>) {
		setState((state) => ({ ...state, ...changes }));
	}

	const changeStatus = (options: typeof statusOptions) => {
		const value = options.length ? options[0].value : "";
		changeState({ Status: value });
	};

	async function submit() {
		if (!state.SAPIN) {
			setErrMsg(`Select member`);
		} else {
			if (action === "add") {
				await dispatch(addVoter(state));
			} else {
				const changes = shallowDiff(voter, state);
				await dispatch(updateVoter(voter.id!, changes));
			}
			close();
		}
	}

	const title = action === "add" ? "Add voter" : "Update voter";

	return (
		<Form
			style={{ width: 500 }}
			title={title}
			submit={submit}
			cancel={close}
			errorText={errMsg}
		>
			<Row>
				<Field label="Member:">
					<MemberSelector
						style={{ maxWidth: 400, flex: 1 }}
						value={state.SAPIN}
						onChange={(value) =>
							setState({ ...state, SAPIN: value })
						}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Status:">
					<Select
						style={{ width: 120 }}
						values={[
							statusOptions.find((v) => v.value === state.Status),
						]}
						options={statusOptions}
						onChange={changeStatus}
						portal={document.querySelector("#root")}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Excused:">
					<Checkbox
						checked={state.Excused}
						onChange={() =>
							changeState({ Excused: !state.Excused })
						}
					/>
				</Field>
			</Row>
		</Form>
	);
}

function VoterEditModal({
	isOpen,
	close,
	voter,
	action,
}: {
	isOpen: boolean;
	close: () => void;
	ballot_id: number | null;
	voter: VoterCreate;
	action: "add" | "update" | null;
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
			style={{ overflow: "unset" }}
		>
			<VoterEditForm voter={voter} action={action} close={close} />
		</AppModal>
	);
}

export default VoterEditModal;
