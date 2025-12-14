import React from "react";
import {
	Form,
	Tab,
	Tabs,
	DropdownButton,
	Row,
	Col,
	Container,
} from "react-bootstrap";

import { useEmailHostKey } from "@/edit/emailHostKeys";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

import styles from "./meetings.module.css";

/** Helper functions to maintain a list of IDs */
function useSelectIds() {
	const [ids, setIds] = React.useState<string[]>([]);

	const addId = React.useCallback(
		(value: string) =>
			setIds((ids) => (ids.includes(value) ? ids : [...ids, value])),
		[setIds]
	);

	const removeId = React.useCallback(
		(value: string) => setIds((ids) => ids.filter((id) => id !== value)),
		[setIds]
	);

	const hasId = React.useCallback(
		(value: string) => ids.includes(value),
		[ids]
	);

	return [ids, addId, removeId, hasId] as const;
}

function EmailHostKeysForm({ close }: { close: () => void }) {
	const [selectedGroupIds, addGroupId, removeGroupId, hasGroupId] =
		useSelectIds();
	const { groupIds, getGroupEmailBody, getGroupLabel, sendGroupEmails } =
		useEmailHostKey();
	const [busy, setBusy] = React.useState(false);
	console.log(groupIds);

	function onChangeGroupId(e: React.ChangeEvent<HTMLInputElement>) {
		if (e.target.checked) addGroupId(e.target.value);
		else removeGroupId(e.target.value);
	}

	async function onSubmit(e: React.ChangeEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await sendGroupEmails(selectedGroupIds);
		setBusy(false);
		close();
	}

	function tabTitle(id: string) {
		return (
			<div key={id} style={{ display: "flex", alignItems: "center" }}>
				<Form.Check
					id={"select-" + id}
					value={id}
					onChange={onChangeGroupId}
					checked={hasGroupId(id)}
					label={getGroupLabel(id)}
				/>
			</div>
		);
	}

	return (
		<Form
			onSubmit={onSubmit}
			style={{ minWidth: "900px", maxHeight: "80vh", overflow: "auto" }}
			className={styles["meetings-email"] + " p-3"}
		>
			<Row className="mb-3">
				<Col>
					<h3 className="title">
						Select subgroups to receive host keys
					</h3>
				</Col>
			</Row>
			<Tabs defaultActiveKey={groupIds[0]}>
				{groupIds.map((groupId) => {
					return (
						<Tab
							key={groupId}
							eventKey={groupId}
							title={tabTitle(groupId)}
						>
							<Container
								className="mt-3 mb-3"
								dangerouslySetInnerHTML={{
									__html: getGroupEmailBody(groupId),
								}}
							/>
						</Tab>
					);
				})}
			</Tabs>
			<SubmitCancelRow
				submitLabel="Send"
				cancel={close}
				disabled={selectedGroupIds.length === 0}
				busy={busy}
			/>
		</Form>
	);
}

export function EmailHostKeys({ disabled }: { disabled?: boolean }) {
	const [show, setShow] = React.useState(false);

	return (
		<DropdownButton
			variant="light"
			title="Email host keys"
			show={show}
			onToggle={() => setShow(!show)}
			disabled={disabled}
		>
			<EmailHostKeysForm close={() => setShow(false)} />
		</DropdownButton>
	);
}
