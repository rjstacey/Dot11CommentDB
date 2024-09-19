import React from "react";
import {
	Row,
	Col,
	Field,
	Input,
	isMultiple,
	Multiple,
	shallowDiff,
	deepMergeTagMultiple,
	useDebounce,
} from "dot11-components";

import { useAppDispatch } from "../store/hooks";
import {
	updateBallots,
	setCurrentGroupProject,
	BallotType,
	Ballot,
	BallotEdit,
	BallotUpdate,
} from "../store/ballots";

import SelectGroup from "./GroupSelector";
import SelectProject from "./ProjectSelector";
import BallotDatesEdit from "./BallotDatesEdit";
import BallotTypeEdit from "./BallotTypeEdit";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

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
			<BallotTypeEdit
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotDatesEdit
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>

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
		console.log(changes);
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
