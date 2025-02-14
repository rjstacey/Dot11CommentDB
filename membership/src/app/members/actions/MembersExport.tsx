import React from "react";
import {
	Button,
	Form,
	Row,
	Dropdown,
	DropdownRendererProps,
	Checkbox,
} from "dot11-components";

import { useAppDispatch } from "@/store/hooks";
import { exportMembersPublic, exportVotingMembers } from "@/store/members";

function VotingMembersExportForm({ methods }: DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const [forPlenary, setForPlenary] = React.useState(false);
	const [forDVL, setForDVL] = React.useState(true);

	return (
		<Form
			style={{ width: 300 }}
			submit={() => dispatch(exportVotingMembers(forPlenary, forDVL))}
			cancel={methods.close}
		>
			<Row>
				{
					'Export a list of voters (members with "Voter" or "ExOfficio" status).'
				}
			</Row>
			<Row>
				<label htmlFor="forPlenary">
					<span>{'Include "Potential Voters":'}</span>
					<br />
					<span>{"(Can vote at a plenary session)"}</span>
				</label>
				<Checkbox
					id="forPlenary"
					checked={forPlenary}
					onChange={(e) => setForPlenary(e.target.checked)}
				/>
			</Row>
			<Row>
				<label htmlFor="forDVL">
					<span>For DirectVoteLive:</span>
				</label>
				<Checkbox
					id="forDVL"
					checked={forDVL}
					onChange={(e) => setForDVL(e.target.checked)}
				/>
			</Row>
		</Form>
	);
}

function VotingMembersExportDropdown() {
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
					title="Export a list of voters"
					isActive={state.isOpen}
					onClick={state.isOpen ? methods.close : methods.open}
				>
					<span>Voters</span>
					<span>List</span>
				</Button>
			)}
			dropdownRenderer={(props) => <VotingMembersExportForm {...props} />}
		/>
	);
}

export function MembersExport() {
	const dispatch = useAppDispatch();

	return (
		<>
			<Button
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					fontSize: 10,
					fontWeight: 700,
				}}
				title="Export public member list"
				onClick={() => dispatch(exportMembersPublic())}
			>
				<span>Members</span>
				<span>List</span>
			</Button>
			<VotingMembersExportDropdown />
		</>
	);
}
