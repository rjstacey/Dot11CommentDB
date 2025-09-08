import React from "react";
import { Button } from "react-bootstrap";
import { AppTable, ConfirmModal, ShowFilters } from "@common";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { BallotType, selectBallot } from "@/store/ballots";
import {
	fields,
	deleteVoters,
	votersSelectors,
	votersActions,
	selectVotersBallot_id,
	Voter,
} from "@/store/voters";

import { tableColumns } from "./tableColumns";

import type { VotersContext } from "./layout";

const RowActions = ({
	onEdit,
	onDelete,
}: {
	onEdit: () => void;
	onDelete: () => void;
}) => (
	<div style={{ display: "flex", justifyContent: "center" }}>
		<Button
			variant="outline-primary"
			className="bi-pencil"
			onClick={onEdit}
		/>
		<Button
			variant="outline-primary"
			className="bi-trash"
			onClick={onDelete}
		/>
	</div>
);

function VotersTable({ setVotersState }: VotersContext) {
	const dispatch = useAppDispatch();
	const id = useAppSelector(selectVotersBallot_id);
	const b = useAppSelector((state) =>
		id ? selectBallot(state, id) : undefined
	);
	const [columns, maxWidth] = React.useMemo(() => {
		const onDelete = async (voter: Voter) => {
			const ok = await ConfirmModal.show(
				`Are you sure you want to remove ${voter.SAPIN} ${voter.Name} from the voting pool?`
			);
			if (ok) dispatch(deleteVoters([voter.id]));
		};

		const columns = tableColumns.map((col) => {
			if (col.key === "Actions") {
				return {
					...col,
					cellRenderer: ({ rowData }: { rowData: Voter }) => (
						<RowActions
							onEdit={() =>
								setVotersState({
									action: "update",
									voter: rowData,
								})
							}
							onDelete={() => onDelete(rowData)}
						/>
					),
				};
			}
			return col;
		});
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);
		return [columns, maxWidth];
	}, [dispatch, setVotersState]);

	return b?.Type === BallotType.WG ? (
		<div className="table-container centered-rows">
			<ShowFilters
				style={{ maxWidth }}
				fields={fields}
				selectors={votersSelectors}
				actions={votersActions}
			/>

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
	) : (
		<div className="table-container" style={{ justifyContent: "center" }}>
			<span>No voting pool</span>
		</div>
	);
}

export default VotersTable;
