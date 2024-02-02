import * as React from "react";
import styles from "./Table.module.css";

const Table = ({ className, ...props }: React.ComponentProps<"table">) => (
	<table className={styles.table} {...props} />
);

export const tableEmpty = (
	<tr>
		<td className="empty">Empty</td>
	</tr>
);

export type TableColumn = {
	/** Column key */
	key: string;
	/** Column label (used in <th>{label}</th>) */
	label: string | JSX.Element;
	gridTemplate?: any;
	/** A function to render cell element for entry */
	renderCell?: (entry: any) => React.ReactNode;
	/** style for the <th> and <td> column cell */
	styleCell?: React.CSSProperties;
};

/*
 * Edit a simple array of objects.
 *
 * The columns arrays has one entry per column with properties:
 *  key - A unique key for the column
 *  label - The column label (string or element)
 *  renderCell(entry) - A function to render the contents of the cell for a given entry (obtained from values)
 *  gridTemplate - The gridTemplateColumns entry for the column (e.g., '200px' or 'minmax(200px, auto)')
 *
 * The values array is a list of entries (array of objects)
 */
export function EditTable({
	columns,
	values,
	rowId,
}: {
	columns: TableColumn[] /** Column definitions */;
	values: any[];
	rowId?: string;
}) {
	const gridTemplateColumns = columns
		.map((col) => col.gridTemplate || "auto")
		.join(" ");

	let header = (
		<tr>
			{columns.map((col, i) => (
				<th key={col.key} style={col.styleCell}>
					{col.label}
				</th>
			))}
		</tr>
	);

	let rows = values.map((entry, i) => (
		<tr key={rowId ? entry[rowId] : i}>
			{columns.map((col) => (
				<td key={col.key} style={col.styleCell}>
					{col.renderCell ? col.renderCell(entry) : entry[col.key]}
				</td>
			))}
		</tr>
	));

	return (
		<table className={styles.table} style={{ gridTemplateColumns }}>
			<thead>{header}</thead>
			<tbody>{rows.length > 0 ? rows : tableEmpty}</tbody>
		</table>
	);
}

export default Table;
