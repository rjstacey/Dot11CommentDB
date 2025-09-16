import * as React from "react";
import { EntityId } from "@reduxjs/toolkit";
import { Button, FormControl } from "react-bootstrap";
import { InputTime } from "@common";
import { EditTable as Table, TableColumn } from "@/components/Table";
import { RawSessionSelector } from "@/components/SessionSelector";

import { useAppSelector } from "@/store/hooks";
import { selectSessionEntities, Timeslot } from "@/store/sessions";

const tableColumns: TableColumn[] = [
	{ key: "name", label: "Name", gridTemplate: "auto" },
	{ key: "startTime", label: "Start", gridTemplate: "auto" },
	{ key: "endTime", label: "End", gridTemplate: "auto" },
	{ key: "action", label: "", gridTemplate: "auto" },
];

const defaultEntry: Omit<Timeslot, "id"> = {
	name: "",
	startTime: "",
	endTime: "",
};

function TimeslotDetails({
	timeslots,
	setTimeslots,
	readOnly,
}: {
	timeslots: Timeslot[];
	setTimeslots: (timeslots: Timeslot[]) => void;
	readOnly?: boolean;
}) {
	const entities = useAppSelector(selectSessionEntities);

	const columns = React.useMemo(() => {
		const importTimeslotsFromSession = (sessionId: EntityId) => {
			const session = entities[sessionId];
			if (session) setTimeslots(session.timeslots);
		};

		const addTimeslot = (slot: Omit<Timeslot, "id">) => {
			const updateTimeslots = timeslots.slice();
			const id =
				timeslots.reduce((maxId, slot) => Math.max(maxId, slot.id), 0) +
				1;
			updateTimeslots.push({ ...slot, id });
			setTimeslots(updateTimeslots);
		};

		const updateTimeslot = (id: number, changes: Partial<Timeslot>) => {
			const updateTimeslots = timeslots.slice();
			const i = timeslots.findIndex((slot) => slot.id === id);
			if (i >= 0) updateTimeslots[i] = { ...timeslots[i], ...changes };
			setTimeslots(updateTimeslots);
		};

		const removeTimeslot = (id: number) => {
			const updateTimeslots = timeslots.slice();
			const i = timeslots.findIndex((slot) => slot.id === id);
			if (i >= 0) updateTimeslots.splice(i, 1);
			setTimeslots(updateTimeslots);
		};

		let columns = tableColumns.slice();
		if (readOnly) columns.filter((col) => col.key !== "action");
		columns = columns.map((col) => {
			if (col.key === "name") {
				col.renderCell = (entry) => (
					<FormControl
						style={{ width: "10rem" }}
						type="search"
						value={entry.name}
						onChange={(e) =>
							updateTimeslot(entry.id, { name: e.target.value })
						}
						disabled={readOnly}
					/>
				);
			} else if (col.key === "startTime") {
				col.renderCell = (entry) => (
					<InputTime
						style={{ width: "6rem" }}
						value={entry.startTime}
						onChange={(startTime) =>
							updateTimeslot(entry.id, {
								startTime,
							})
						}
						disabled={readOnly}
					/>
				);
			} else if (col.key === "endTime") {
				col.renderCell = (entry) => (
					<InputTime
						style={{ width: "6rem" }}
						value={entry.endTime}
						onChange={(endTime) =>
							updateTimeslot(entry.id, {
								endTime,
							})
						}
						disabled={readOnly}
					/>
				);
			} else if (col.key === "action") {
				col.renderCell = (entry) => (
					<Button
						variant="light"
						className="bi-trash"
						onClick={() => removeTimeslot(entry.id)}
					/>
				);
				col.label = (
					<div
						style={{
							display: "flex",
							justifyContent: "space-evenly",
							alignItems: "center",
							gap: "0.5rem",
						}}
					>
						<Button
							variant="light"
							className="bi-plus-lg"
							onClick={() => addTimeslot(defaultEntry)}
						/>
						<RawSessionSelector
							onChange={importTimeslotsFromSession}
						/>
					</div>
				);
			}
			return col;
		});

		return columns;
	}, [setTimeslots, timeslots, entities, readOnly]);

	return <Table columns={columns} values={timeslots} />;
}

export default TimeslotDetails;
