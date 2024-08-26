import * as React from "react";
import { useAppDispatch } from "../store/hooks";
import {
	ActionButton,
	AppTable,
	SelectHeaderCell,
	SelectCell,
	ConfirmModal,
	ShowFilters,
	ColumnProperties,
} from "dot11-components";
import {
	fields,
	deleteVoters,
	votersSelectors,
	votersActions,
	Voter,
} from "../store/voters";

import type { SetVotersState } from "./layout";

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

function VotersTable({ setVotersState }: { setVotersState: SetVotersState }) {
	const dispatch = useAppDispatch();

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
						setVotersState({ action: "update", voter: rowData })
					}
					onDelete={() => onDelete(rowData)}
				/>
			),
		});
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);
		return [columns, maxWidth];
	}, [dispatch, setVotersState]);

	return (
		<>
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
		</>
	);
}

export default VotersTable;
