import { Row, Col, Button, DropdownButton } from "react-bootstrap";
import { SplitPanelButton, TableColumnSelector, Select } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	meetingsSelectors,
	meetingsActions,
	selectUiProperties,
	setUiProperties,
	setSelectedSlots,
} from "@/store/meetings";

import SessionSelectorNav from "@/components/SessionSelectorNav";

import MeetingsEmail from "./MeetingsEmail";
import CopyMeetingListButton from "./CopyMeetingList";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";
import React from "react";

const DisplayFormat = {
	0: "Table view",
	1: "1-day slot view",
	3: "3-day slot view",
	5: "5-day slot view",
	6: "6-day slot view",
};

const displayFormatOptions = Object.entries(DisplayFormat).map(
	([key, label]) => ({ value: parseInt(key), label })
);

function SelectDisplayFormat({
	value,
	onChange,
}: {
	value: number;
	onChange: (value: number) => void;
}) {
	const values = displayFormatOptions.filter((o) => o.value === value);

	function handleChange(values: typeof displayFormatOptions) {
		onChange(values.length > 0 ? values[0].value : 0);
	}

	return (
		<Select
			style={{ width: 180 }}
			searchable={false}
			values={values}
			options={displayFormatOptions}
			onChange={handleChange}
		/>
	);
}

function MeetingsActions() {
	const dispatch = useAppDispatch();
	const [showEmail, setShowEmail] = React.useState(false);

	const showDays: number = useAppSelector(selectUiProperties).showDays || 0;
	const setShowDays = (showDays: number) =>
		dispatch(setUiProperties({ showDays }));

	function changeShowDays(newShowDays: number) {
		if (showDays !== 0 && newShowDays === 0) dispatch(setSelectedSlots([]));
		setShowDays(newShowDays);
	}

	return (
		<Row className="w-100 m-3">
			<Col>
				<SessionSelectorNav allowShowDateRange />
			</Col>
			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				{showDays === 0 && (
					<TableColumnSelector
						selectors={meetingsSelectors}
						actions={meetingsActions}
						columns={tableColumns}
					/>
				)}
				<SplitPanelButton
					selectors={meetingsSelectors}
					actions={meetingsActions}
				/>
			</Col>

			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<SelectDisplayFormat
					value={showDays}
					onChange={changeShowDays}
				/>
				<DropdownButton
					variant="light"
					title="Email host keys"
					show={showEmail}
					onToggle={() => setShowEmail(!showEmail)}
				>
					<MeetingsEmail close={() => setShowEmail(false)} />
				</DropdownButton>

				<CopyMeetingListButton />
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}

export default MeetingsActions;
