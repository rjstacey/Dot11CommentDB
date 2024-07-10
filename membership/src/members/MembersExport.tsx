import React from "react";
import {
	ButtonGroup,
	Button,
	Form,
	Row,
	Dropdown,
	DropdownRendererProps,
	Checkbox,
} from "dot11-components";

import { useAppDispatch } from "../store/hooks";
import {
	exportMembersPrivate,
	exportMembersPublic,
	exportVotingMembers,
} from "../store/members";

function VotingMembersExportForm({ methods }: DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const [forPlenary, setForPlenary] = React.useState(false);

	return (
		<Form
			style={{ width: 250 }}
			submit={() => dispatch(exportVotingMembers(forPlenary))}
			cancel={methods.close}
		>
			<Row>
				Export a list of voting members for a future session. If the
				session is a plenary the list includes potential voters.
			</Row>
			<Row>
				<label htmlFor="forPlenary">For plenary:</label>
				<Checkbox
					id="forPlenary"
					checked={forPlenary}
					onClick={() => setForPlenary(!forPlenary)}
				/>
			</Row>
		</Form>
	);
}

function VotingMembersExportDropdown() {
	return (
		<Dropdown
			handle={false}
			selectRenderer={({
				props,
				state,
				methods,
			}: DropdownRendererProps) => (
				<Button
					title="Export voting members list for session"
					isActive={state.isOpen}
					onClick={state.isOpen ? methods.close : methods.open}
				>
					<div
						style={{
							position: "relative",
							top: "-4px",
							height: 0,
							fontSize: "x-small",
							fontWeight: "bold",
						}}
					>
						session
					</div>
					<i
						className="bi-person-lines-fill"
						style={{
							position: "relative",
							top: "4px",
							marginLeft: "auto",
							marginRight: "auto",
						}}
					/>
				</Button>
			)}
			dropdownRenderer={(props) => <VotingMembersExportForm {...props} />}
		/>
	);
}
function MembersExport() {
	const dispatch = useAppDispatch();

	return (
		<ButtonGroup className="button-group">
			<div>Export</div>
			<div style={{ display: "flex" }}>
				<Button
					style={{ position: "relative" }}
					title="Export public member list"
					onClick={() => dispatch(exportMembersPublic())}
				>
					<div
						style={{
							position: "relative",
							top: "-4px",
							height: 0,
							fontSize: "x-small",
							fontWeight: "bold",
						}}
					>
						public
					</div>
					<i
						className="bi-person-lines-fill"
						style={{
							position: "relative",
							top: "4px",
							marginLeft: "auto",
							marginRight: "auto",
						}}
					/>
				</Button>
				<Button
					title="Export private member list"
					onClick={() => dispatch(exportMembersPrivate())}
				>
					<div
						style={{
							position: "relative",
							top: "-4px",
							height: 0,
							fontSize: "x-small",
							fontWeight: "bold",
						}}
					>
						private
					</div>
					<i
						className="bi-person-lines-fill"
						style={{
							position: "relative",
							top: "4px",
							marginLeft: "auto",
							marginRight: "auto",
						}}
					/>
				</Button>
				<VotingMembersExportDropdown />
			</div>
		</ButtonGroup>
	);
}

export default MembersExport;
