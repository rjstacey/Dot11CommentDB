import React from "react";
import { connect, ConnectedProps } from "react-redux";

import {
	shallowDiff,
	recursivelyDiffObjects,
	debounce,
	ActionButton,
	Row,
	Spinner,
	ConfirmModal,
	Multiple,
} from "dot11-components";

import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";
import EditBallot from "./BallotEdit";

import type { RootState } from "../store";
import { selectIsOnline } from "../store/offline";
import {
	updateBallot,
	addBallot,
	deleteBallots,
	setCurrentGroupProject,
	setUiProperties,
	selectBallotsState,
	Ballot,
	BallotEdit,
} from "../store/ballots";

function BallotWithActions({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: MultipleBallot;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);

	return (
		<div className="main">
			<Row style={{ justifyContent: "center" }}>
				<Spinner style={{ visibility: busy ? "visible" : "hidden" }} />
			</Row>
			<EditBallot
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<ResultsActions
				ballot_id={ballot.id}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
			<CommentsActions
				ballot_id={ballot.id}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
		</div>
	);
}

type MultipleBallot = Multiple<Ballot>;

type BallotDetailState = {
	saved: MultipleBallot;
	edited: MultipleBallot;
	originals: Ballot[];
};

class _BallotDetail extends React.Component<
	BallotDetailProps,
	BallotDetailState
> {
	constructor(props: BallotDetailProps) {
		super(props);
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	triggerSave: ReturnType<typeof debounce>;

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props: BallotDetailProps): BallotDetailState => {
		const { ballots, selected } = props;
		let diff = {},
			originals: Ballot[] = [];
		for (const id of selected) {
			const ballot = ballots[id];
			if (ballot) {
				diff = recursivelyDiffObjects(diff, ballot);
				originals.push(ballot);
			}
		}
		return {
			saved: diff as MultipleBallot,
			edited: diff as MultipleBallot,
			originals: originals,
		};
	};

	updateBallot = (changes: Partial<BallotEdit>) => {
		const { readOnly, uiProperties } = this.props;
		if (readOnly || !uiProperties.edit) {
			console.warn("Update when read-only");
			return;
		}
		// merge in the edits and trigger a debounced save
		this.setState(
			(state) => ({ ...state, edited: { ...state.edited, ...changes } }),
			this.triggerSave
		);
	};

	save = () => {
		const { edited, saved, originals } = this.state;
		const d = shallowDiff(saved, edited) as Partial<Ballot>;
		const updates: (Partial<Ballot> & { id: number })[] = [];
		for (const o of originals) {
			if (Object.keys(d).length > 0) updates.push({ ...d, id: o.id });
		}
		if (updates.length > 0)
			updates.forEach((u) => this.props.updateBallot(u.id, u));
		if (d.groupId || d.Project) {
			this.props.setCurrentGroupProject({
				groupId: edited.groupId,
				project: edited.Project,
			});
		}
		this.setState((state) => ({ ...state, saved: edited }));
	};

	handleRemoveSelected = async () => {
		const { selected, ballots } = this.props;
		const list = selected.map((id) => ballots[id]!.BallotID).join(", ");
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ballot${
				selected.length > 0 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await this.props.deleteBallots(selected);
	};

	render() {
		const { loading, uiProperties, setUiProperties, readOnly, isOnline } =
			this.props;

		let notAvailableStr: string | undefined;
		if (loading) notAvailableStr = "Loading...";
		else if (this.state.originals.length === 0)
			notAvailableStr = "Nothing selected";
		const disableButtons = Boolean(notAvailableStr) || !isOnline; // disable buttons if displaying string

		return (
			<>
				<div className="top-row justify-right">
					{!readOnly && (
						<span>
							<ActionButton
								name="edit"
								title="Edit ballot"
								disabled={disableButtons}
								isActive={uiProperties.edit}
								onClick={() =>
									setUiProperties({
										edit: !uiProperties.edit,
									})
								}
							/>
							<ActionButton
								name="delete"
								title="Delete ballot"
								disabled={disableButtons}
								onClick={this.handleRemoveSelected}
							/>
						</span>
					)}
				</div>
				{notAvailableStr ? (
					<div className="placeholder">
						<span>{notAvailableStr}</span>
					</div>
				) : (
					<BallotWithActions
						ballot={this.state.edited}
						updateBallot={this.updateBallot}
						readOnly={readOnly || !isOnline || !uiProperties.edit}
					/>
				)}
			</>
		);
	}
}

const connector = connect(
	(state: RootState) => {
		const ballotsState = selectBallotsState(state);
		return {
			ballots: ballotsState.entities,
			loading: ballotsState.loading,
			selected: ballotsState.selected,
			uiProperties: ballotsState.ui,
			isOnline: selectIsOnline(state),
		};
	},
	{
		addBallot,
		setCurrentGroupProject,
		updateBallot,
		deleteBallots,
		setUiProperties,
	}
);

type BallotDetailProps = ConnectedProps<typeof connector> & {
	className?: string;
	style?: React.CSSProperties;
	readOnly?: boolean;
};

const BallotDetail = connector(_BallotDetail);

export default BallotDetail;
