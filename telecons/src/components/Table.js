import styled from '@emotion/styled';

const Table = styled.table`
	display: grid;
	grid-template-columns: minmax(200px, auto) minmax(200px, auto) minmax(300px, 1fr) 40px;
	border-spacing: 1px;

	thead, tbody, tr {
		display: contents;
	}

	th, td {
		padding: 10px;
		border: gray solid 1px;
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

	th {
		background: #f6f6f6;
		text-align: left;
		font-weight: bold;
		font-size: 1rem;
	}

	td {
		display: flex;
		align-items: center;
		padding-top: 5px;
		padding-bottom: 5px;
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

export const TableEmpty = () => <tr><td className='empty'>Empty</td></tr>

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
export function EditTable({columns, values}) {
	const gridTemplateColumns = columns.map(col => col.gridTemplate).join(' ');

	return (
		<Table style={{gridTemplateColumns}} >
			<thead>
				<tr>
					{columns.map((col, i) => <th key={col.key}>{col.label}</th>)}
				</tr>
			</thead>
			<tbody>
				{values.length > 0?
					values.map((entry, i) => <tr key={i}>{columns.map((col) => <td key={col.key}>{col.renderCell(entry)}</td>)}</tr>):
					<TableEmpty />}
			</tbody>
		</Table>
	)
}

export default Table;
