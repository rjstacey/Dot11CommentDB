/** Render table for embedding in an email */
export function renderTable(headings: string[], values: string[][]) {
	const header = `<tr style="text-align: left">${headings
		.map((d) => `<th>${d}</th>`)
		.join("")}</tr>`;
	const row = (r: string[]) =>
		`<tr>${r.map((d) => `<td>${d}</td>`).join("")}</tr>`;
	const body =
		values.length > 0
			? values.map(row).join("")
			: `<tr><td colspan="${headings.length}" style="color: gray; font-style: italic;">(Empty)</td></tr>`;

	const table = `<table style="border-collapse: collapse" cellpadding="5" border="1">
            <thead>${header}</thead>
            <tbody>${body}</tbody>
        </table>`;

	return table;
}
