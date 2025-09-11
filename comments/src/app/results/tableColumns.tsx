import {
	ColumnProperties,
	TablesConfig,
	ChangeableColumnProperties,
	CellRendererProps,
} from "@common";

import { AccessLevel } from "@/store/user";
import { BallotType } from "@/store/ballots";

const renderItem = ({ rowData, dataKey }: CellRendererProps) => (
	<div className="text-truncate">{rowData[dataKey]}</div>
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
];

export function getDefaultTablesConfig(
	access: number,
	type: number
): TablesConfig {
	const columns = tableColumns.reduce((o, c) => {
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
	}, {} as { [key: string]: ChangeableColumnProperties });
	return { default: { fixed: false, columns } };
}
