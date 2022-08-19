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

export default Table;
