import { useParams } from "react-router";
import { Container } from "react-bootstrap";
import { Counts, useReportData } from "./reportData";

import styles from "./reports.module.css";

function renderTable(data: Counts[]) {
	if (data.length === 0) return <span>Empty</span>;

	const nCol = Object.keys(data[0]).length;
	const header = (
		<tr>
			{Object.keys(data[0]).map((d, i) => (
				<th key={i}>
					<span>{d}</span>
				</th>
			))}
		</tr>
	);
	const row = (r: Counts, i: number) => (
		<tr key={i}>
			{Object.values(r).map((d, i) => (
				<td key={i}>
					<span>{d}</span>
				</td>
			))}
		</tr>
	);
	return (
		<table
			className={styles.table}
			style={{
				gridTemplateColumns: `repeat(${nCol}, auto)`,
				borderCollapse: "collapse",
			}}
			cellPadding="5"
			border={1}
		>
			<thead>{header}</thead>
			<tbody>{data.map(row)}</tbody>
		</table>
	);
}

export function Report() {
	const { report } = useParams();
	const data = useReportData(report);

	return (
		<Container className="d-flex flex-grow overflow-auto">
			{renderTable(data)}
		</Container>
	);
}
