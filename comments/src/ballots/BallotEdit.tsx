import * as React from "react";
import {
	isMultiple,
	Row,
	Col,
	Field,
	ListItem,
	Checkbox,
	Input,
	TextArea,
	Multiple,
	shallowDiff,
	recursivelyDiffObjects,
} from "dot11-components";

import CheckboxListSelect from "./CheckboxListSelect";
import SelectGroup from "./GroupSelector";
import SelectProject from "./ProjectSelector";
import SelectPrevBallot from "./PrevBallotSelecor";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectBallotsState,
	updateBallots,
	setCurrentGroupProject,
	BallotType,
	BallotTypeOptions,
	BallotStageOptions,
	Ballot,
	BallotEdit,
	BallotUpdate,
} from "../store/ballots";

import { useDebounce } from "../components/useDebounce";

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

export function Column1({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) {
	const isMultipleBallots = isMultiple(ballot.id);

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
				<Field label="Ballot ID:">
					<Input
						type="search"
						name="BallotID"
						value={
							isMultiple(ballot.BallotID) ? "" : ballot.BallotID
						}
						onChange={change}
						placeholder={
							isMultiple(ballot.BallotID)
								? MULTIPLE_STR
								: BLANK_STR
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
								isMultiple(ballot.BallotID)
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
			<Col>
				<CheckboxListSelect
					label="Ballot type:"
					options={BallotTypeOptions}
					value={ballot.Type}
					onChange={(value) => updateBallot({ Type: value })}
					readOnly={readOnly}
				/>
				{(ballot.Type === BallotType.WG ||
					ballot.Type === BallotType.SA) && (
					<>
						<CheckboxListSelect
							label="Ballot stage:"
							options={BallotStageOptions}
							value={
								isMultiple(ballot.IsRecirc)
									? ballot.IsRecirc
									: ballot.IsRecirc
									? 1
									: 0
							}
							onChange={(value) =>
								updateBallot({ IsRecirc: value ? true : false })
							}
							readOnly={readOnly}
						/>
						<ListItem>
							<Checkbox
								id="IsComplete"
								checked={
									isMultiple(ballot.IsComplete)
										? false
										: ballot.IsComplete
								}
								indeterminate={isMultiple(ballot.IsComplete)}
								onChange={(e) =>
									updateBallot({
										IsComplete: e.target.checked,
									})
								}
								disabled={readOnly}
							/>
							<label htmlFor="IsComplete">
								Final in ballot series
							</label>
						</ListItem>
					</>
				)}
			</Col>
		</Row>
	);
}

export function BallotEditMultiple({
	ids,
	readOnly,
}: {
	ids: number[];
	readOnly: boolean;
}) {
	const dispatch = useAppDispatch();
	const { entities } = useAppSelector(selectBallotsState);

	const [edited, setEdited] = React.useState<Multiple<Ballot> | null>(null);
	const [saved, setSaved] = React.useState<Multiple<Ballot> | null>(null);
	const [editIds, setEditIds] = React.useState<number[]>([]);

	React.useEffect(() => {
		if (ids.join() !== editIds.join()) {
			let diff: null | Multiple<Ballot> = null,
				editIds: number[] = [];
			for (const id of ids) {
				const ballot = entities[id];
				if (ballot) {
					diff = recursivelyDiffObjects(diff || {}, ballot);
					editIds.push(ballot.id);
				}
			}
			setEdited(diff);
			setSaved(diff);
			setEditIds(editIds);
		}
	}, [entities, editIds, ids]);

	const triggerSave = useDebounce(() => {
		const changes = shallowDiff(saved, edited) as Partial<BallotEdit>;
		let updates: BallotUpdate[] = [];
		if (Object.keys(changes).length > 0) {
			updates = editIds.map((id) => ({ id, changes }));
			dispatch(updateBallots(updates));
		}
		if (changes.groupId || changes.Project) {
			dispatch(
				setCurrentGroupProject({
					groupId: edited.groupId,
					project: edited.Project,
				})
			);
		}
		setSaved(edited);
	});

	const handleUpdate = (changes: Partial<BallotEdit>) => {
		if (readOnly) {
			console.warn("Update when read-only");
			return;
		}
		// merge in the edits and trigger a debounced save
		setEdited((edited) => ({ ...edited, ...changes }));
		triggerSave();
	};

	return edited ? (
		<EditBallot
			ballot={edited}
			updateBallot={handleUpdate}
			readOnly={readOnly}
		/>
	) : null;
}
