import React from "react";

import {
	Form,
	Row,
	List,
	ListItem,
	Checkbox,
	Field,
	Input,
	ActionButtonDropdown,
	DropdownRendererProps,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	votersFromSpreadsheet,
	votersFromMembersSnapshot,
} from "../store/voters";
import { Ballot, selectBallot } from "../store/ballots";

type Source = "members" | "upload";

type State = {
	source: Source;
	date: string;
	file: File | null;
};

function initState(ballot: Ballot | undefined): State {
	let date = (ballot?.Start ? ballot.Start : new Date().toISOString()).slice(
		0,
		10
	);
	return {
		source: "members",
		date,
		file: null,
	};
}

function getErrorText(state: State) {
	if (state.source === "members" && !state.date)
		return "Select date for members snapshot";
	if (state.source === "upload" && !state.file) return "Select a file upload";
}

export function VotersImportForm({
	close,
	ballot,
}: {
	close: () => void;
	ballot?: Ballot;
}) {
	const dispatch = useAppDispatch();
	const [state, setState] = React.useState<State>(() => initState(ballot));
	const [busy, setBusy] = React.useState(false);
	const fileRef = React.useRef<HTMLInputElement>(null);

	const errorText = getErrorText(state);

	async function submit() {
		if (errorText || !ballot) return;
		setBusy(true);
		await dispatch(
			state.source === "members"
				? votersFromMembersSnapshot(ballot.id, state.date)
				: votersFromSpreadsheet(ballot.id, state.file!)
		);
		setBusy(false);
		close();
	}

	function changeState(changes: Partial<State>) {
		setState({ ...state, ...changes });
	}

	return (
		<Form
			style={{width: 300}}
			title="Create voter pool"
			errorText={errorText}
			submit={submit}
			cancel={close}
			busy={busy}
		>
			<Row>
				<List label="">
					<ListItem>
						<Checkbox
							checked={state.source === "members"}
							onChange={() => changeState({ source: "members" })}
						/>
						<Field label="Member snapshot:">
							<Input
								type="date"
								value={state.date}
								onChange={(e) =>
									changeState({ date: e.target.value })
								}
							/>
						</Field>
					</ListItem>
					<ListItem>
						<Checkbox
							checked={state.source === "upload"}
							onChange={(e) => {
								changeState({ source: "upload" });
								fileRef.current?.click();
							}}
						/>
						<label htmlFor="fromFile">
							{"Upload from " +
								(state.file ? state.file.name : "file")}
						</label>
						<input
							id="fromFile"
							type="file"
							hidden
							accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							ref={fileRef}
							onChange={(e) =>
								changeState({
									file: e.target.files
										? e.target.files[0]
										: null,
								})
							}
						/>
					</ListItem>
				</List>
			</Row>
		</Form>
	);
}

function VotersImportButton({ ballot_id }: { ballot_id?: number }) {
	const ballot = useAppSelector((state) =>
		ballot_id ? selectBallot(state, ballot_id) : undefined
	);

	return (
		<ActionButtonDropdown
			name="import"
			title="Import voters"
			disabled={!ballot}
			dropdownRenderer={({ methods }: DropdownRendererProps) => (
				<VotersImportForm
					ballot={ballot}
					close={methods.close}
				/>
			)}
		/>
	);
}

export default VotersImportButton;
