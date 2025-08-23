import * as React from "react";
import { Dropdown, Form, Button, CloseButton, Row, Col } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import {
	exportMembers,
	activeMemberStatusValues,
	MembersExportQuery,
	MemberStatus,
} from "@/store/members";

function MembersExportForm() {
	const dispatch = useAppDispatch();
	const [statuses, setStatuses] = React.useState<MemberStatus[]>([
		...activeMemberStatusValues,
	]);
	const [format, setFormat] =
		React.useState<MembersExportQuery["format"]>("public");
	const [date, setDate] = React.useState<string | undefined>(undefined);

	function changeFormat(format: MembersExportQuery["format"]) {
		let s: MemberStatus[];
		if (format === "public") s = [...activeMemberStatusValues];
		else s = ["Voter", "ExOfficio"];
		setStatuses(s);
		setFormat(format);
	}

	function toggleStatus(status: MemberStatus) {
		const i = statuses.indexOf(status);
		if (i >= 0) statuses.splice(i, 1);
		else statuses.push(status);
		setStatuses([...statuses]);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		e.stopPropagation();
		dispatch(exportMembers({ format, status: statuses, date }));
	}

	return (
		<Form onSubmit={handleSubmit} className="p-3">
			<Form.Group as={Row} className="mb-3">
				<Form.Label>Purpose:</Form.Label>
				<Col sm={{ offset: 4, span: 8 }}>
					<Form.Check
						type="radio"
						id="publicList"
						name="format"
						value="public"
						checked={format === "public"}
						onChange={() => changeFormat("public")}
						label="Public list"
					/>
					<Form.Check
						type="radio"
						id="sessionRegistration"
						name="format"
						value="registration"
						checked={format === "registration"}
						onChange={() => changeFormat("registration")}
						label="Session registration"
					/>
					<Form.Check
						type="radio"
						id="dvl"
						name="format"
						value="dvl"
						checked={format === "dvl"}
						onChange={() => changeFormat("dvl")}
						label="DirectVoteLive"
					/>
					<Form.Check
						type="radio"
						id="publication"
						name="format"
						value="publication"
						checked={format === "publication"}
						onChange={() => changeFormat("publication")}
						label="Publication"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label as="span">Include members with status:</Form.Label>
				<Col sm={{ offset: 4, span: 8 }}>
					{activeMemberStatusValues.map((s) => (
						<Form.Check
							key={s}
							type="checkbox"
							checked={statuses.includes(s)}
							onChange={() => toggleStatus(s)}
							label={s}
							id={s}
						/>
					))}
				</Col>
			</Form.Group>
			<Form.Group className="mb-3" controlId="date">
				<Form.Label>Snapshot date:</Form.Label>
				<Col
					sm={{ offset: 4, span: 8 }}
					className="d-flex align-items-center"
				>
					<Form.Control
						type="date"
						value={date || ""}
						onChange={(e) => setDate(e.target.value)}
					/>
					<CloseButton onClick={() => setDate(undefined)} />
				</Col>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">Export</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function MembersExport() {
	return (
		<Dropdown align="end">
			<Dropdown.Toggle variant="success-outline">
				Export Members List
			</Dropdown.Toggle>
			<Dropdown.Menu style={{ minWidth: "300px" }}>
				<MembersExportForm />
			</Dropdown.Menu>
		</Dropdown>
	);
}
