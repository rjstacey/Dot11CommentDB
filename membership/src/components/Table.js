import styled from '@emotion/styled';

const Table = styled.table`
	display: grid;
	border-spacing: 1px;

	thead, tbody, tr {
		display: contents;
	}

	th, td {
		/*border: gray solid 1px;*/
		vertical-align: top;
	}

	th:first-of-type, td:first-of-type {
		grid-column: 1;
	}

	tr:first-of-type td {
		border-top: none;
	}

	tr:not(:last-of-type) td {
		border-bottom: none;
	}

	th:not(:last-of-type),
	td:not(:last-of-type) {
		border-right: none;
	}

	th, td {
		display: flex;
		align-items: center;
		padding: 5px;
	}

	th {
		text-align: left;
		font-weight: normal;
		font-size: 1rem;
	}

	td.empty {
		grid-column: 1 / -1;
		colspan: 0;
		color: gray;
		font-style: italic;
	}

	tr:nth-of-type(even) td {
		background: #fafafa;
	}
`;

export const tableEmpty = <tr><td className='empty'>Empty</td></tr>

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
export function EditTable({columns, values, rowId}) {
	const gridTemplateColumns = columns.map(col => col.gridTemplate || 'auto').join(' ');

	let header =
		<tr>
			{columns.map((col, i) => 
				<th key={col.key} style={col.styleCell}>
					{col.label}
				</th>)}
		</tr>;

	let rows = values.map((entry, i) =>
		<tr key={rowId? entry[rowId]: i}>
			{columns.map((col) => 
				<td key={col.key} style={col.styleCell}>
					{col.renderCell? col.renderCell(entry): entry[col.key]}
				</td>)}
		</tr>
	);

	if (rows.length === 0)
		rows = tableEmpty;

	return (
		<Table style={{gridTemplateColumns}} >
			<thead>
				{header}
			</thead>
			<tbody>
				{rows}
			</tbody>
		</Table>
	)
}

export default Table;
