import React from "react";

import {
	AppTable,
	ShowFilters,
	ActionButton,
	ColumnProperties,
	TablesConfig,
	ChangeableColumnProperties,
	CellRendererProps,
	AppModal,
	Form,
	Row,
	Field,
	Select,
	TextArea,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	fields,
	selectResultsBallot_id,
	resultsSelectors,
	resultsActions,
	upsertTableColumns,
	selectResultsAccess,
	updateResults,
	type Result,
	type ResultChange,
	type ResultUpdate,
} from "@/store/results";
import { selectBallot, getBallotId, BallotType, Ballot } from "@/store/ballots";

const voteOptions = [
	{ label: "Approve", value: "Approve" },
	{ label: "Disapprove", value: "Disapprove" },
	{
		label: "Abstain - Lack of expertise",
		value: "Abstain - Lack of expertise",
	},
	{
		label: "Abstain - Lack of time",
		value: "Abstain - Lack of time",
		disabled: true,
	},
	{
		label: "Abstain - Conflict of Interest",
		value: "Abstain - Conflict of Interest",
		disabled: true,
	},
	{ label: "Abstain - Other", value: "Abstain - Other", disabled: true },
];

function SelectVote({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	let options = voteOptions;
	let values = voteOptions.filter((v) => v.value === value);
	if (value && values.length === 0) {
		const missingOption = { label: value, value, disabled: true };
		options = [...options, missingOption];
		values = [missingOption];
	}
	return (
		<Select
			style={{ width: 220 }}
			options={options}
			values={values}
			onChange={(values) => onChange(values[0].value)}
		/>
	);
}

function EditResultModal({
	ballot,
	result,
	close,
}: {
	ballot: Ballot | undefined;
	result: Result | null;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [open, setOpen] = React.useState(Boolean(result));
	const [update, setUpdate] = React.useState<ResultUpdate>({
		id: "",
		changes: {},
	});

	React.useEffect(() => {
		if (result) {
			if (update.id !== result.id) {
				const changes: ResultChange = {
					vote: result.vote,
					notes: result.notes,
				};
				setUpdate({ id: result.id, changes });
			}
		}
		setOpen(Boolean(result) && Boolean(ballot));
	}, [update.id, result, ballot]);

	function change(changes: ResultChange) {
		setUpdate({
			id: update.id,
			changes: { ...update.changes, ...changes },
		});
	}

	async function submit() {
		await dispatch(updateResults(ballot!.id, [update]));
		close();
	}

	const memberStr = result
		? `${result.SAPIN} ${result.Name} (${result.Affiliation})`
		: "";

	return (
		<AppModal isOpen={open}>
			<Form
				title={`Edit result for ${ballot ? getBallotId(ballot) : "-"}`}
				cancel={close}
				submit={submit}
			>
				<Row>{memberStr}</Row>
				<Row>
					<Field label="Vote:">
						<SelectVote
							value={update.changes.vote!}
							onChange={(vote) => change({ vote })}
						/>
					</Field>
				</Row>
				<Row>
					<Field id="notes" label="Notes:">
						<TextArea
							style={{ width: "100%" }}
							rows={2}
							value={update.changes.notes || ""}
							onChange={(e) => change({ notes: e.target.value })}
						/>
					</Field>
				</Row>
			</Form>
		</AppModal>
	);
}

const lineTruncStyle: React.CSSProperties = {
	overflow: "hidden",
	whiteSpace: "nowrap",
	textOverflow: "ellipses",
};

const renderItem = ({ rowData, dataKey }: CellRendererProps) => (
	<div style={lineTruncStyle}>{rowData[dataKey]}</div>
);

export const tableColumns: ColumnProperties[] = [
	{ key: "SAPIN", label: "SA PIN", width: 75 },
	{ key: "Name", label: "Name", width: 200, cellRenderer: renderItem },
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 200,
		cellRenderer: renderItem,
	},
	{ key: "Email", label: "Email", width: 250, cellRenderer: renderItem },
	{ key: "Status", label: "Status", width: 150 },
	{ key: "vote", label: "Vote", width: 210 },
	{ key: "commentCount", label: "Comments", width: 110 },
	{ key: "totalCommentCount", label: "Total Comments", width: 110 },
	{ key: "lastSAPIN", label: "SA PIN Used", width: 100 },
	{ key: "BallotName", label: "Ballot", width: 100 },
	{ key: "notes", label: "Notes", width: 250, flexShrink: 1, flexGrow: 1 },
	{ key: "Action", label: "", width: 100 },
];

function getDefaultTablesConfig(access: number, type: number): TablesConfig {
	const columns = tableColumns.reduce(
		(o, c) => {
			let columnConfig: ChangeableColumnProperties = {
				shown: true,
				width: c.width!,
				unselectable: false,
			};
			if (
				c.key === "SAPIN" &&
				(access < AccessLevel.admin || type === BallotType.SA)
			) {
				columnConfig = {
					...columnConfig,
					shown: false,
					unselectable: false,
				};
			}
			if (c.key === "Email" && access < AccessLevel.admin) {
				columnConfig = {
					...columnConfig,
					shown: false,
					unselectable: false,
				};
			}
			o[c.key] = columnConfig;
			return o;
		},
		{} as { [key: string]: ChangeableColumnProperties }
	);
	return { default: { fixed: false, columns } };
}

function updateTableConfigAction(access: number, type: number) {
	if (access < AccessLevel.admin)
		return upsertTableColumns({
			columns: { SAPIN: { shown: false }, Email: { shown: false } },
		});

	if (type === BallotType.SA)
		return upsertTableColumns({
			columns: { SAPIN: { shown: false }, Email: { shown: true } },
		});

	return upsertTableColumns({
		columns: { SAPIN: { shown: true }, Email: { shown: true } },
	});
}

const maxWidth = 1600;

function Results() {
	const dispatch = useAppDispatch();

	const access = useAppSelector(selectResultsAccess);
	const resultsBallot_id = useAppSelector(selectResultsBallot_id);
	const resultsBallot = useAppSelector((state) =>
		resultsBallot_id ? selectBallot(state, resultsBallot_id) : undefined
	);

	const defaultTablesConfig = React.useMemo(() => {
		if (resultsBallot)
			return getDefaultTablesConfig(access, resultsBallot.Type);
	}, [access, resultsBallot]);

	React.useEffect(() => {
		if (resultsBallot)
			dispatch(updateTableConfigAction(access, resultsBallot.Type));
	}, [dispatch, access, resultsBallot]);

	const [editResult, setEditResult] = React.useState<Result | null>(null);

	const columns = React.useMemo(() => {
		return tableColumns.map((col) => {
			if (col.key === "Action") {
				col = {
					...col,
					cellRenderer: (props) => (
						<ActionButton
							name="edit"
							onClick={() => setEditResult(props.rowData)}
						/>
					),
				};
			}
			return col;
		});
	}, [setEditResult]);

	return (
		<>
			<div className="table-container centered-rows">
				<ShowFilters
					style={{ maxWidth }}
					selectors={resultsSelectors}
					actions={resultsActions}
					fields={fields}
				/>
				<AppTable
					fitWidth
					fixed
					defaultTablesConfig={defaultTablesConfig}
					columns={columns}
					headerHeight={38}
					estimatedRowHeight={32}
					selectors={resultsSelectors}
					actions={resultsActions}
				/>
			</div>
			<EditResultModal
				ballot={resultsBallot}
				result={editResult}
				close={() => setEditResult(null)}
			/>
		</>
	);
}

export default Results;
