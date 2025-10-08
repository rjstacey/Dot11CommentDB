import * as React from "react";
import { EntityId } from "@reduxjs/toolkit";
import { Button, FormControl } from "react-bootstrap";
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
	original,
	readOnly,
}: {
	timeslots: Timeslot[];
	setTimeslots: (timeslots: Timeslot[]) => void;
	original?: Timeslot[];
	readOnly?: boolean;
}) {
	const entities = useAppSelector(selectSessionEntities);

	const importTimeslotsFromSession = (sessionId: EntityId) => {
		const session = entities[sessionId];
		if (session) setTimeslots(session.timeslots);
	};

	const addTimeslot = (slot: Omit<Timeslot, "id">) => {
		const updateTimeslots = timeslots.slice();
		const id =
			timeslots.reduce((maxId, slot) => Math.max(maxId, slot.id), 0) + 1;
		updateTimeslots.push({ ...slot, id });
		setTimeslots(updateTimeslots);
	};

	const columns = React.useMemo(() => {
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
						id={`timeslot-name-${entry.id}`}
						style={{ width: "10rem" }}
						type="search"
						value={entry.name}
						onChange={(e) =>
							updateTimeslot(entry.id, { name: e.target.value })
						}
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				);
			} else if (col.key === "startTime") {
				col.renderCell = (entry) => (
					<FormControl
						id={`timeslot-start-${entry.id}`}
						//style={{ width: "6rem" }}
						type="time"
						value={entry.startTime}
						onChange={(e) =>
							updateTimeslot(entry.id, {
								startTime: e.target.value,
							})
						}
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				);
			} else if (col.key === "endTime") {
				col.renderCell = (entry) => (
					<FormControl
						id={`timeslot-end-${entry.id}`}
						//style={{ width: "6rem" }}
						type="time"
						value={entry.endTime}
						onChange={(e) =>
							updateTimeslot(entry.id, {
								endTime: e.target.value,
							})
						}
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				);
			} else if (col.key === "action") {
				col.renderCell = (entry) => (
					<button
						id={`timeslot-remove-${entry.id}`}
						className="bi-trash icon action"
						onClick={() => removeTimeslot(entry.id)}
						disabled={readOnly}
					/>
				);
			}
			return col;
		});

		return columns;
	}, [setTimeslots, timeslots, entities, readOnly]);

	const className =
		original && timeslots !== original ? "has-changes" : undefined;

	return (
		<>
			<div className="d-flex justify-content-end align-items-center gap-2 p-2">
				<Button
					variant="light"
					className="bi-plus-lg"
					onClick={() => addTimeslot(defaultEntry)}
					disabled={readOnly}
				>
					{" Add Timeslot"}
				</Button>
				<RawSessionSelector
					onChange={importTimeslotsFromSession}
					disabled={readOnly}
				/>
			</div>
			<Table columns={columns} values={timeslots} className={className} />
		</>
	);
}

export default TimeslotDetails;
