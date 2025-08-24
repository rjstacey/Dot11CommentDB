import { v4 as uuid } from "uuid";
import { Form, Row, Button } from "react-bootstrap";

import { OfficerId, Officer } from "@/store/officers";

import MemberSelector from "./MemberActiveSelector";
import OfficerPositionSelector from "./OfficerPositionSelector";
import { EditTable as Table, TableColumn } from "@/components/Table";
import { GroupCreate } from "@/store/groups";

const tableColumns: TableColumn[] = [
	{ key: "position", label: "Position", gridTemplate: "minmax(200px, auto)" },
	{ key: "member", label: "Member", gridTemplate: "minmax(300px, 1fr)" },
	{ key: "action", label: "", gridTemplate: "40px" },
];

function Officers({
	officers,
	onChange,
	group,
	readOnly,
}: {
	officers: Officer[];
	onChange: (officers: Officer[]) => void;
	group: GroupCreate;
	readOnly?: boolean;
}) {
	function addOne() {
		const officer: Officer = {
			id: uuid(),
			group_id: group.id || "",
			position: "",
			sapin: 0,
		};
		officers = [...officers, officer];
		onChange(officers);
	}

	function updateOne(id: OfficerId, changes: Partial<Officer>) {
		const i = officers.findIndex((o) => o.id === id);
		if (i < 0) throw Error("Can't find officer with id=" + id);
		officers = officers.slice();
		officers[i] = { ...officers[i], ...changes };
		onChange(officers);
	}

	function removeOne(id: OfficerId) {
		const i = officers.findIndex((o) => o.id === id);
		if (i < 0) throw Error("Can't find officer with id=" + id);
		officers = officers.slice();
		officers.splice(i, 1);
		onChange(officers);
	}

	const columns = (
		readOnly
			? tableColumns.filter((col) => col.key !== "action")
			: tableColumns
	).map((col) => {
		col = { ...col };
		if (col.key === "position") {
			col.renderCell = (entry: Officer) => (
				<OfficerPositionSelector
					value={entry.position}
					onChange={(position: string) =>
						updateOne(entry.id, { position })
					}
					groupType={group.type!}
					readOnly={readOnly}
				/>
			);
		} else if (col.key === "member") {
			col.renderCell = (entry: Officer) => (
				<MemberSelector
					value={entry.sapin}
					onChange={(sapin: number) => updateOne(entry.id, { sapin })}
					readOnly={readOnly}
				/>
			);
		} else if (col.key === "action") {
			col.renderCell = (entry: Officer) => (
				<Button
					variant="outline-danger"
					className="bi-trash"
					onClick={() => removeOne(entry.id)}
				/>
			);
			col.label = (
				<Button
					variant="outline-primary"
					className="bi-plus-lg"
					onClick={addOne}
				/>
			);
		}
		return col;
	});

	return (
		<Form.Group as={Row} className="mb-3">
			<Form.Label as="span" column>
				Officers:
			</Form.Label>
			<Table columns={columns} values={officers} />
		</Form.Group>
	);
}

export default Officers;
