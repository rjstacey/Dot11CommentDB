import * as React from "react";
import {
	Row,
	Col,
	Field,
	Checkbox,
	Input,
	TextArea,
	isMultiple,
	Multiple,
	shallowDiff,
	deepMergeTagMultiple,
	useDebounce,
} from "dot11-components";

import SelectGroup from "./GroupSelector";
import SelectProject from "./ProjectSelector";
import SelectPrevBallot from "./PrevBallotSelecor";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	updateBallots,
	setCurrentGroupProject,
	BallotType,
	Ballot,
	BallotEdit,
	BallotUpdate,
	selectBallots,
} from "../store/ballots";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

/* Convert an ISO date string to US eastern time and return string in form "YYYY-MM-DD" */
function dateToShortDate(isoDate: string | null) {
	if (!isoDate) return "";
	const utcDate = new Date(isoDate);
	const date = new Date(
		utcDate.toLocaleString("en-US", { timeZone: "America/New_York" })
	);
	return (
		date.getFullYear() +
		"-" +
		("0" + (date.getMonth() + 1)).slice(-2) +
		"-" +
		("0" + date.getDate()).slice(-2)
	);
}

/* Parse date in form "YYYY-MM-DD" as US eastern time and convert to UTC ISO date string */
function shortDateToDate(shortDateStr: string) {
	const date = new Date(shortDateStr); // local time
	const easternDate = new Date(
		date.toLocaleString("en-US", { timeZone: "America/New_York" })
	);
	const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
	const diff = utcDate.getTime() - easternDate.getTime();
	let newDate = new Date(date.getTime() + diff);
	return isNaN(newDate.getTime()) ? "" : newDate.toISOString();
}

const TopicTextArea = (props: React.ComponentProps<typeof TextArea>) => (
	<TextArea
		style={{
			flex: 1,
			minHeight: "3.5em",
		}}
		{...props}
	/>
);

const ballotTypeLabels = {
	[BallotType.CC]: "CC",
	[BallotType.WG]: "LB",
	[BallotType.SA]: "SA",
	[BallotType.Motion]: "Motion",
};

const BallotTypeSelect = ({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) => (
	<div
		style={{
			display: "flex",
			justifyContent: "space-between",
			flexWrap: "wrap",
			width: 300,
		}}
	>
		{Object.entries(BallotType).map(([key, value]) => (
			<div style={{ display: "flex", alignContent: "center" }} key={key}>
				<Checkbox
					id={key}
					checked={
						isMultiple(ballot.Type) ? false : ballot.Type === value
					}
					indeterminate={isMultiple(value)}
					onChange={(e) => updateBallot({ Type: value })}
					disabled={readOnly}
				/>
				<label htmlFor={key}>{ballotTypeLabels[value]}</label>
			</div>
		))}
	</div>
);

const BallotStage = ({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) => (
	<div
		style={{
			display: "flex",
			justifyContent: "space-between",
			flexWrap: "wrap",
			width: 200,
		}}
	>
		<div style={{ display: "flex", alignContent: "center" }}>
			<Checkbox
				id="initial"
				checked={isMultiple(ballot.IsRecirc) ? false : !ballot.IsRecirc}
				indeterminate={isMultiple(ballot.IsRecirc)}
				onChange={(e) => updateBallot({ IsRecirc: !ballot.IsRecirc })}
				disabled={readOnly}
			/>
			<label htmlFor="initial">Initial</label>
		</div>
		<div style={{ display: "flex", alignContent: "center" }}>
			<Checkbox
				id="recirc"
				checked={isMultiple(ballot.IsRecirc) ? false : ballot.IsRecirc}
				indeterminate={isMultiple(ballot.IsRecirc)}
				onChange={(e) => updateBallot({ IsRecirc: !ballot.IsRecirc })}
				disabled={readOnly}
			/>
			<label htmlFor="recirc">Recirc</label>
		</div>
		<div style={{ display: "flex", alignContent: "center" }}>
			<Checkbox
				id="IsComplete"
				checked={
					isMultiple(ballot.IsComplete) ? false : ballot.IsComplete
				}
				indeterminate={isMultiple(ballot.IsComplete)}
				onChange={(e) =>
					updateBallot({
						IsComplete: e.target.checked,
					})
				}
				disabled={readOnly}
			/>
			<label htmlFor="IsComplete">Final in ballot series</label>
		</div>
	</div>
);

function nextBallotNumber(ballots: Ballot[], type: number) {
	let maxNumber = 0;
	for (const b of ballots) {
		if (b.Type === type && b.number && b.number > maxNumber)
			maxNumber = b.number;
	}
	return maxNumber + 1;
}

export function Column1({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) {
	const ballots = useAppSelector(selectBallots);
	const isMultipleBallots = isMultiple(ballot.id);

	function handleUpdate(changes: Partial<BallotEdit>) {
		if (typeof changes.Type !== "undefined")
			changes.number = nextBallotNumber(ballots, changes.Type);
		updateBallot(changes);
	}

	const change: React.ChangeEventHandler<
		HTMLInputElement | HTMLTextAreaElement
	> = (e) => {
		const { name, value } = e.target;
		updateBallot({ [name]: value });
	};

	const changeDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const { name, value } = e.target;
		const dateStr = shortDateToDate(value);
		updateBallot({ [name]: dateStr });
	};

	return (
		<>
			<Row>
				<Field label="Group:">
					<SelectGroup
						value={
							isMultiple(ballot.groupId) ? null : ballot.groupId
						}
						onChange={(groupId) => updateBallot({ groupId })}
						placeholder={
							isMultiple(ballot.groupId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Project:">
					<SelectProject
						value={isMultiple(ballot.Project) ? "" : ballot.Project}
						onChange={(Project) => updateBallot({ Project })}
						groupId={
							isMultiple(ballot.groupId) ? null : ballot.groupId
						}
						placeholder={
							isMultiple(ballot.groupId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Ballot type:">
					<BallotTypeSelect
						ballot={ballot}
						updateBallot={handleUpdate}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Ballot number:">
					<Input
						style={{ lineHeight: "25px" }}
						type="number"
						name="number"
						value={
							isMultiple(ballot.number) || ballot.number === null
								? ""
								: ballot.number
						}
						onChange={(e) =>
							updateBallot({ number: Number(e.target.value) })
						}
						placeholder={
							isMultiple(ballot.number) ? MULTIPLE_STR : BLANK_STR
						}
						disabled={readOnly || isMultipleBallots}
					/>
				</Field>
			</Row>
			{ballot.Type !== BallotType.SA && (
				<Row>
					<Field label="ePoll number:">
						<Input
							type="search"
							name="EpollNum"
							value={
								"" +
								(isMultiple(ballot.EpollNum)
									? ""
									: ballot.EpollNum)
							}
							onChange={(e) =>
								updateBallot({
									EpollNum: Number(e.target.value),
								})
							}
							placeholder={
								isMultiple(ballot.EpollNum)
									? MULTIPLE_STR
									: BLANK_STR
							}
							disabled={readOnly || isMultipleBallots}
						/>
					</Field>
				</Row>
			)}
			<Row>
				<Field label="Document:">
					<Input
						type="search"
						name="Document"
						value={
							isMultiple(ballot.Document) ? "" : ballot.Document
						}
						placeholder={
							isMultiple(ballot.Document)
								? MULTIPLE_STR
								: BLANK_STR
						}
						onChange={change}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Topic:">
					<TopicTextArea
						name="Topic"
						value={isMultiple(ballot.Topic) ? "" : ballot.Topic}
						placeholder={
							isMultiple(ballot.Topic) ? MULTIPLE_STR : BLANK_STR
						}
						onChange={change}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Start:">
					<Input
						type="date"
						name="Start"
						value={
							isMultiple(ballot.Start)
								? ""
								: dateToShortDate(ballot.Start)
						}
						onChange={changeDate}
						disabled={readOnly || isMultipleBallots}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="End:">
					<Input
						type="date"
						name="End"
						value={
							isMultiple(ballot.End)
								? ""
								: dateToShortDate(ballot.End)
						}
						onChange={changeDate}
						disabled={readOnly || isMultipleBallots}
					/>
				</Field>
			</Row>
			{(ballot.Type === BallotType.WG ||
				ballot.Type === BallotType.SA) && (
				<Row>
					<Field label="Ballot stage:">
						<BallotStage
							ballot={ballot}
							updateBallot={updateBallot}
							readOnly={readOnly}
						/>
					</Field>
				</Row>
			)}
			{(ballot.Type === BallotType.WG || ballot.Type === BallotType.SA) &&
				!!ballot.IsRecirc && (
					<Row>
						<Field label="Previous ballot:">
							<SelectPrevBallot
								value={
									isMultiple(ballot.prev_id)
										? null
										: ballot.prev_id
								}
								ballot_id={
									isMultiple(ballot.id) ? 0 : ballot.id
								}
								placeholder={
									isMultiple(ballot.prev_id)
										? MULTIPLE_STR
										: BLANK_STR
								}
								onChange={(value) =>
									updateBallot({ prev_id: value })
								}
								style={{ width: 150 }}
								readOnly={readOnly || isMultipleBallots}
							/>
						</Field>
					</Row>
				)}
		</>
	);
}

export function EditBallot({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) {
	return (
		<Row>
			<Col>
				<Column1
					ballot={ballot}
					updateBallot={updateBallot}
					readOnly={readOnly}
				/>
			</Col>
		</Row>
	);
}

export function BallotEditMultiple({
	ballots,
	readOnly,
}: {
	ballots: Ballot[];
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	const [edited, setEdited] = React.useState<Multiple<Ballot> | null>(null);
	const [saved, setSaved] = React.useState<Multiple<Ballot> | null>(null);
	const [editedBallots, setEditedBallots] = React.useState<Ballot[]>([]);

	React.useEffect(() => {
		if (
			ballots.map((b) => b.id).join() ===
			editedBallots.map((b) => b.id).join()
		)
			return;
		let diff: Multiple<Ballot> | null = null;
		ballots.forEach((ballot) => {
			diff = deepMergeTagMultiple(diff || {}, ballot) as Multiple<Ballot>;
		});
		setEdited(diff);
		setSaved(diff);
		setEditedBallots(ballots);
	}, [ballots, editedBallots]);

	const triggerSave = useDebounce(() => {
		const changes = shallowDiff(saved!, edited!) as Partial<BallotEdit>;
		let updates: BallotUpdate[] = [];
		if (Object.keys(changes).length > 0) {
			updates = ballots.map((b) => ({ id: b.id, changes }));
			dispatch(updateBallots(updates));
		}
		if (changes.groupId || changes.Project) {
			dispatch(
				setCurrentGroupProject({
					groupId: edited!.groupId,
					project: edited!.Project,
				})
			);
		}
		setSaved(edited);
	});

	const handleUpdate = (changes: Partial<BallotEdit>) => {
		if (readOnly) {
			console.warn("Ballot update while read-only");
			return;
		}
		// merge in the edits and trigger a debounced save
		setEdited((edited) => ({ ...edited!, ...changes }));
		triggerSave();
	};

	if (!edited) return null;

	return (
		<EditBallot
			ballot={edited}
			updateBallot={handleUpdate}
			readOnly={readOnly}
		/>
	);
}
