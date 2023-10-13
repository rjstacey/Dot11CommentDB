import React from "react";
import { connect, ConnectedProps } from "react-redux";

import {
	Col,
	Checkbox,
	displayDateRange,
	debounce,
	shallowDiff,
} from "dot11-components";

import type { RootState } from "../store";

import {
	selectBallotParticipationState,
	selectMemberBallotParticipationCount,
	updateBallotParticipation,
	BallotSeriesParticipationSummary,
} from "../store/ballotParticipation";

import { EditTable as Table, TableColumn } from "../components/Table";

const ballotSeriesParticipationColumns: TableColumn[] = [
	{ key: "project", label: "Project" },
	{ key: "ballotIds", label: "Ballot series" },
	{ key: "period", label: "Period" },
	{ key: "voteSummary", label: "Last vote" },
	{
		key: "excused",
		label: "Excused",
		styleCell: { justifyContent: "center" },
	},
	{ key: "SAPIN", label: "SA PIN" },
];

type MemberBallotParticipationProps = {
	SAPIN: number;
	readOnly?: boolean;
};

type MemberBallotParticipationInternalProps = MemberBallotParticipationProps &
	ConnectedMemberBallotParticipationProps;

type MemberBallotParticipationState = {
	ids: number[];
	edited: Record<number, BallotSeriesParticipationSummary>;
	saved: Record<number, BallotSeriesParticipationSummary>;
	SAPIN: number;
	readOnly: boolean;
};

class MemberBallotParticipation extends React.Component<
	MemberBallotParticipationInternalProps,
	MemberBallotParticipationState
> {
	constructor(props: MemberBallotParticipationInternalProps) {
		super(props);
		this.state = {
			...this.initState(props),
			readOnly: !!props.readOnly,
		};
		this.triggerSave = debounce(this.save, 500);
		this.columns = this.generateColumns(props);
	}

	triggerSave: ReturnType<typeof debounce>;
	columns: TableColumn[];

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	componentDidUpdate() {}

	initState = (props: MemberBallotParticipationInternalProps) => {
		const { entities, SAPIN } = props;
		const summaries: Record<number, BallotSeriesParticipationSummary> = {};
		const ids: number[] = [];
		const entity = entities[SAPIN];
		if (entity) {
			entity.ballotSeriesParticipationSummaries.forEach((summary) => {
				summaries[summary.id] = summary;
				ids.push(summary.id);
			});
		}
		return {
			SAPIN,
			ids,
			edited: summaries,
			saved: summaries,
		};
	};

	save = () => {
		const { SAPIN, ids, edited, saved } = this.state;
		const updates = [];
		for (let id of ids) {
			const changes = shallowDiff(
				saved[id],
				edited[id]
			) as Partial<BallotSeriesParticipationSummary>;
			if (Object.keys(changes).length > 0) updates.push({ id, changes });
		}
		if (updates.length > 0)
			this.props.updateBallotParticipation(SAPIN, updates);
		this.setState((state) => ({ ...state, saved: edited }));
	};

	update = (
		id: number,
		changes: Partial<BallotSeriesParticipationSummary>
	) => {
		console.log(id, changes);
		this.setState(
			{
				edited: {
					...this.state.edited,
					[id]: { ...this.state.edited[id], ...changes },
				},
			},
			this.triggerSave
		);
	};

	generateColumns(props: MemberBallotParticipationInternalProps) {
		const { SAPIN, ballotEntities, ballotSeriesEntities, readOnly } = props;

		function renderDateRange(entity: BallotSeriesParticipationSummary) {
			const ballotSeries = ballotSeriesEntities[entity.id]!;
			return displayDateRange(ballotSeries.start, ballotSeries.end);
		}

		function renderVoteSummary(entity: BallotSeriesParticipationSummary) {
			if (!entity.ballot_id) return "Did not vote";
			const ballotId = ballotEntities[entity.ballot_id]?.BallotID || "?";
			return `${ballotId}/${entity.vote}/${entity.commentCount}`;
		}

		return ballotSeriesParticipationColumns.map((col) => {
			let renderCell:
				| ((
						entry: BallotSeriesParticipationSummary
				  ) => JSX.Element | string | number)
				| undefined;
			if (col.key === "project")
				renderCell = (entry) =>
					ballotSeriesEntities[entry.id]?.project || "?";
			if (col.key === "ballotIds")
				renderCell = (entry) =>
					ballotSeriesEntities[entry.id]?.ballotIds
						.map((id) => ballotEntities[id]?.BallotID || "?")
						.join(", ") || "?";
			if (col.key === "period") renderCell = renderDateRange;
			if (col.key === "excused") {
				renderCell = (entry) => (
					<Checkbox
						checked={!!entry.excused}
						onChange={(e) =>
							this.update(entry.id, { excused: e.target.checked })
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "voteSummary") {
				renderCell = renderVoteSummary;
			}
			if (col.key === "SAPIN") {
				renderCell = (entry) =>
					(entry.SAPIN !== SAPIN && entry.SAPIN) || "";
			}

			if (renderCell) return { ...col, renderCell };

			return col;
		});
	}

	render() {
		const { count, total } = this.props;
		const { ids, edited } = this.state;
		const values = ids.map((id) => edited[id]);
		return (
			<Col>
				<label>{`Recent ballot series participation: ${count}/${total}`}</label>
				<Table columns={this.columns} values={values} />
			</Col>
		);
	}
}

const connector = connect(
	(state: RootState, props: MemberBallotParticipationProps) => {
		const { count, total } = selectMemberBallotParticipationCount(
			state,
			props.SAPIN
		);
		const { entities } = selectBallotParticipationState(state);
		const { ids: ballotSeriesIds, entities: ballotSeriesEntities } =
			selectBallotParticipationState(state).ballotSeries;
		const { entities: ballotEntities } =
			selectBallotParticipationState(state).ballots;
		return {
			entities,
			ballotSeriesIds,
			ballotSeriesEntities,
			ballotEntities,
			count,
			total,
		};
	},
	{ updateBallotParticipation }
);

type ConnectedMemberBallotParticipationProps = ConnectedProps<typeof connector>;

const ConnectedMemberBallotParticipation = connector(MemberBallotParticipation);

export default ConnectedMemberBallotParticipation;
