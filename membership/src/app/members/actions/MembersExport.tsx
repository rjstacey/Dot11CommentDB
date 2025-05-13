import React from "react";
import {
	Button,
	Form,
	Row,
	List,
	ListItem,
	Dropdown,
	DropdownRendererProps,
	Checkbox,
	ActionIcon,
} from "dot11-components";

import { useAppDispatch } from "@/store/hooks";
import {
	exportMembers,
	activeMemberStatusValues,
	MembersExportQuery,
	MemberStatus,
} from "@/store/members";

function MembersExportForm({ methods }: DropdownRendererProps) {
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

	return (
		<Form
			style={{ width: 300 }}
			submit={() =>
				dispatch(exportMembers({ format, status: statuses, date }))
			}
			cancel={methods.close}
			title="Export a list of members"
		>
			<Row>
				<List label="Purpose:">
					<ListItem>
						<input
							type="radio"
							id="publicList"
							name="format"
							value="public"
							checked={format === "public"}
							onChange={() => changeFormat("public")}
						/>
						<label htmlFor="publicList">Public list</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="dvl"
							name="format"
							value="registration"
							checked={format === "registration"}
							onChange={() => changeFormat("registration")}
						/>
						<label htmlFor="dvl">Session registration</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="dvl"
							name="format"
							value="dvl"
							checked={format === "dvl"}
							onChange={() => changeFormat("dvl")}
						/>
						<label htmlFor="dvl">DirectVoteLive</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="publication"
							name="format"
							value="publication"
							checked={format === "publication"}
							onChange={() => changeFormat("publication")}
						/>
						<label htmlFor="publication">Publication</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<List label="Include members with status:">
					{activeMemberStatusValues.map((s) => (
						<ListItem key={s}>
							<Checkbox
								id={s}
								checked={statuses.includes(s)}
								onChange={() => toggleStatus(s)}
							/>
							<label htmlFor={s}>{s}</label>
						</ListItem>
					))}
				</List>
			</Row>
			<Row>
				<label htmlFor="date">
					<span>Snapshot date:</span>
				</label>
				<div>
					<input
						id="date"
						type="date"
						value={date || ""}
						onChange={(e) => setDate(e.target.value)}
					/>
					<ActionIcon
						name="bi-x"
						onClick={() => setDate(undefined)}
					/>
				</div>
			</Row>
		</Form>
	);
}

export function MembersExport() {
	return (
		<Dropdown
			handle={false}
			selectRenderer={({ state, methods }: DropdownRendererProps) => (
				<Button
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						fontSize: 10,
						fontWeight: 700,
					}}
					title="Export a list of members"
					isActive={state.isOpen}
					onClick={state.isOpen ? methods.close : methods.open}
				>
					<span>Export</span>
					<span>Members List</span>
				</Button>
			)}
			dropdownRenderer={(props) => <MembersExportForm {...props} />}
		/>
	);
}
