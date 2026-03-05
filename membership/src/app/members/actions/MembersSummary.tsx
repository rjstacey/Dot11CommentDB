import { Col, Table } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectMembersSummary } from "@/store/members";

export function MembersSummary(props: React.ComponentProps<typeof Col>) {
	const summary = useAppSelector(selectMembersSummary);

	return (
		<Col {...props}>
			<Table bordered responsive className="mb-0">
				<thead>
					<tr>
						{Object.keys(summary).map((key) => (
							<th key={key}>{key}</th>
						))}
					</tr>
				</thead>
				<tbody>
					<tr>
						{Object.entries(summary).map(([key, value]) => (
							<td key={key} className="text-center">
								{value}
							</td>
						))}
					</tr>
				</tbody>
			</Table>
		</Col>
	);
}
