import * as React from "react";
import { Button, FormControl } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectSessionEntities, Room } from "@/store/sessions";

import { EditTable as Table, TableColumn } from "@/components/Table";
import { RawSessionSelector } from "@/components/SessionSelector";

const tableColumns: TableColumn[] = [
	{ key: "name", label: "Name", gridTemplate: "auto" },
	{
		key: "description",
		label: "Description",
		gridTemplate: "auto",
	},
	{ key: "action", label: "", gridTemplate: "auto" },
];

const defaultEntry = { name: "", description: "" };

function RoomDetails({
	rooms,
	setRooms,
	readOnly,
}: {
	rooms: Room[];
	setRooms: (rooms: Room[]) => void;
	readOnly?: boolean;
}) {
	const entities = useAppSelector(selectSessionEntities);

	const importRoomsFromSession = (sessionId: number) => {
		const session = entities[sessionId];
		if (session) setRooms(session.rooms);
	};

	const addRoom = (room: Omit<Room, "id">) => {
		const updatedRooms = rooms.slice();
		const id =
			rooms.reduce((maxId, room) => Math.max(maxId, room.id), 0) + 1;
		updatedRooms.push({ ...room, id });
		setRooms(updatedRooms);
	};

	const columns = React.useMemo(() => {
		const updateRoom = (id: number, changes: Partial<Room>) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex((room) => room.id === id);
			if (i >= 0) {
				updatedRooms[i] = { ...rooms[i], ...changes };
				setRooms(updatedRooms);
			}
		};

		const removeRoom = (id: number) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex((room) => room.id === id);
			if (i >= 0) {
				updatedRooms.splice(i, 1);
				setRooms(updatedRooms);
			}
		};

		const moveRoomUp = (id: number) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex((room) => room.id === id);
			if (i > 0) {
				const [room] = updatedRooms.splice(i, 1);
				updatedRooms.splice(i - 1, 0, room);
				setRooms(updatedRooms);
			}
		};

		const moveRoomDown = (id: number) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex((room) => room.id === id);
			if (i >= 0) {
				const [room] = updatedRooms.splice(i, 1);
				updatedRooms.splice(i + 1, 0, room);
				setRooms(updatedRooms);
			}
		};

		let columns = tableColumns;
		if (readOnly) columns = columns.filter((col) => col.key !== "action");
		columns = columns.map((col) => {
			col = { ...col };
			if (col.key === "name") {
				col.renderCell = (entry) => (
					<FormControl
						style={{ width: "10rem" }}
						id={`room-${entry.id}-name`}
						aria-label={`Room ${entry.id} name`}
						type="search"
						value={entry.name}
						onChange={(e) =>
							updateRoom(entry.id, { name: e.target.value })
						}
						disabled={readOnly}
					/>
				);
			} else if (col.key === "description") {
				col.renderCell = (entry) => (
					<FormControl
						style={{ width: "10rem" }}
						id={`room-${entry.id}-description`}
						aria-label={`Room ${entry.id} description`}
						type="search"
						value={entry.description}
						onChange={(e) =>
							updateRoom(entry.id, {
								description: e.target.value,
							})
						}
						disabled={readOnly}
					/>
				);
			} else if (col.key === "action") {
				col.renderCell = (entry) => (
					<div className="d-flex gap-2">
						<button
							className="bi-arrow-left-circle icon action"
							style={{ transform: "rotate(90deg)" }}
							onClick={() => moveRoomUp(entry.id)}
						/>
						<i
							className="bi-arrow-right-circle icon action"
							style={{ transform: "rotate(90deg)" }}
							onClick={() => moveRoomDown(entry.id)}
						/>
						<i
							className="bi-trash icon action"
							onClick={() => removeRoom(entry.id)}
						/>
					</div>
				);
			}
			return col;
		});

		return columns;
	}, [setRooms, rooms, entities, readOnly]);

	return (
		<>
			<div className="d-flex justify-content-end align-items-center gap-2 p-2">
				<Button
					variant="light"
					className="bi-plus-lg"
					onClick={() => addRoom(defaultEntry)}
				>
					{" Add Room"}
				</Button>
				<RawSessionSelector onChange={importRoomsFromSession} />
			</div>

			<Table columns={columns} values={rooms} />
		</>
	);
}

export default RoomDetails;
