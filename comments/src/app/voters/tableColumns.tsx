import { SelectHeaderCell, SelectCell, ColumnProperties } from "@common";
import { votersSelectors, votersActions } from "@/store/voters";

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

export const tableColumns: ColumnPropertiesWithWidth[] = [
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
	{
		key: "Actions",
		label: "Actions",
		width: 100,
	},
];
