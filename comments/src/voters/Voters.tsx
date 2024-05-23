import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	ConfirmModal,
	ActionButton,
	ShowFilters,
	ColumnProperties,
	displayDateRange
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import {
	fields,
	deleteVoters,
	exportVoters,
	selectVotersState,
	selectVotersBallot_id,
	votersSelectors,
	votersActions,
	Voter,
	VoterCreate,
} from "../store/voters";
import {
	getBallotId,
	selectBallotSeries
} from "../store/ballots";

import VotersImportButton from "./VotersImport";
import VoterEditModal from "./VoterEdit";
import ProjectBallotSelector from "../components/ProjectBallotSelector";


function BallotSeriesSummary() {
	const ballotSeries_id = useAppSelector(selectVotersBallot_id);
	const ballotSeries = useAppSelector((state) => ballotSeries_id? selectBallotSeries(state, ballotSeries_id): undefined);

	return (
		<div style={{display: 'flex'}}>
			{ballotSeries?.map(b => (
				<div key={b.id} style={{display: 'flex', flexDirection: 'column', margin: '0 20px'}}>
					<span>{getBallotId(b)}</span>
					<span>{displayDateRange(b.Start!, b.End!)}</span>
				</div>
			))}
		</div>
	)
}

const RowActions = ({
	onEdit,
	onDelete,
}: {
	onEdit: () => void;
	onDelete: () => void;
}) => (
	<div style={{ display: "flex", justifyContent: "center" }}>
		<ActionButton name="edit" title="Edit" onClick={onEdit} />
		<ActionButton name="delete" title="Delete" onClick={onDelete} />
	</div>
);

function getDefaultVoter(ballot_id: number | null): VoterCreate {
	let voter: VoterCreate = {
		SAPIN: 0,
		Status: "Voter",
	};
	if (ballot_id) voter.ballot_id = ballot_id;
	return voter;
}

type ColumnPropertiesWithWidth = ColumnProperties & { width: number };

const controlColumn: ColumnPropertiesWithWidth = {
	key: "__ctrl__",
	width: 30,
	flexGrow: 1,
	flexShrink: 0,
	headerRenderer: (p) => <SelectHeaderCell {...p} />,
	cellRenderer: (p) => (
		<SelectCell
			selectors={votersSelectors}
			actions={votersActions}
			{...p}
		/>
	),
};

const actionsColumn: ColumnPropertiesWithWidth = {
	key: "Actions",
	label: "Actions",
	width: 100,
};

const tableColumns: ColumnPropertiesWithWidth[] = [
	controlColumn,
	{ key: "SAPIN", label: "SA PIN", width: 100 },
	{ key: "Name", label: "Name", width: 200, dropdownWidth: 250 },
	{ key: "Email", label: "Email", width: 250, dropdownWidth: 350 },
	{ key: "Status", label: "Status", width: 100 },
	{
		key: "Excused",
		label: "Excused",
		width: 100,
		dataRenderer: (value) => (value ? "Yes" : ""),
	},
];

type VotersState = {
	action: "add" | "update" | null;
	voter: VoterCreate;
};

function Voters() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const isOnline = useAppSelector(selectIsOnline);

	const votersBallot_id = useAppSelector(selectVotersBallot_id);

	const refresh = () => navigate(".", {replace: true});

	const [editVoter, setEditVoter] = React.useState<VotersState>({
		action: null,
		voter: getDefaultVoter(votersBallot_id),
	});

	const { loading, selected } = useAppSelector(selectVotersState);
	const shownIds = useAppSelector(votersSelectors.selectSortedFilteredIds);

	const [columns, maxWidth] = React.useMemo(() => {
		const onDelete = async (voter: Voter) => {
			const ok = await ConfirmModal.show(
				`Are you sure you want to remove ${voter.SAPIN} ${voter.Name} from the voting pool?`
			);
			if (ok) dispatch(deleteVoters([voter.id]));
		};

		const columns = tableColumns.concat({
			...actionsColumn,
			cellRenderer: ({ rowData }: { rowData: Voter }) => (
				<RowActions
					onEdit={() =>
						setEditVoter({ action: "update", voter: rowData })
					}
					onDelete={() => onDelete(rowData)}
				/>
			),
		});
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);
		return [columns, maxWidth];
	}, [dispatch]);

	async function handleRemoveSelected() {
		const ids = selected.filter((id) => shownIds.includes(id)); // only select checked items that are visible
		if (ids.length) {
			const ok = await ConfirmModal.show(
				`Are you sure you want to delete ${ids.length} entries?`
			);
			if (ok) await dispatch(deleteVoters(ids));
		}
	}

	const handleAddVoter = () =>
		setEditVoter({
			action: "add",
			voter: getDefaultVoter(votersBallot_id!),
		});

	return (
		<>
			<div className="top-row" style={{ maxWidth }}>
				<ProjectBallotSelector />
				<div style={{ display: "flex" }}>
					<ActionButton
						name="add"
						title="Add voter"
						disabled={!votersBallot_id}
						onClick={handleAddVoter}
					/>
					<ActionButton
						name="delete"
						title="Remove selected"
						disabled={selected.length === 0}
						onClick={handleRemoveSelected}
					/>
					<VotersImportButton ballot_id={votersBallot_id} />
					<ActionButton
						name="export"
						title="Export voters"
						disabled={!votersBallot_id || !isOnline}
						onClick={() => dispatch(exportVoters(votersBallot_id!))}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
						disabled={loading || !isOnline}
					/>
				</div>
			</div>

			<div className="top-row" style={{ maxWidth }}>
				<BallotSeriesSummary />
			</div>

			<ShowFilters
				style={{ maxWidth }}
				fields={fields}
				selectors={votersSelectors}
				actions={votersActions}
			/>

			<div className="table-container centered-rows" style={{ maxWidth }}>
				<AppTable
					fitWidth
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					selectors={votersSelectors}
					actions={votersActions}
				/>
			</div>

			<VoterEditModal
				isOpen={Boolean(editVoter.action)}
				close={() =>
					setEditVoter((state) => ({ ...state, action: null }))
				}
				ballot_id={votersBallot_id}
				voter={editVoter.voter}
				action={editVoter.action}
			/>
		</>
	);
}

export default Voters;
