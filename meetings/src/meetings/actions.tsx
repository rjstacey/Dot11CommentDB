import { useNavigate } from "react-router-dom";
import {
	ActionButton,
	ActionButtonDropdown,
	SplitPanelButton,
	TableColumnSelector,
	Select,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	meetingsSelectors,
	meetingsActions,
	selectUiProperties,
	setUiProperties,
	setSelectedSlots,
} from "../store/meetings";

import SessionSelectorNav from "../components/SessionSelectorNav";

import MeetingsEmail from "./MeetingsEmail";
import CopyMeetingListButton from "./CopyMeetingList";

import { tableColumns } from "./table";

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
			values={values}
			options={displayFormatOptions}
			onChange={handleChange}
		/>
	);
}

function MeetingsActions() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const refresh = () => navigate(0);

	let showDays: number = useAppSelector(selectUiProperties).showDays | 0;
	const setShowDays = (showDays: number) =>
		dispatch(setUiProperties({ showDays }));

	function changeShowDays(newShowDays: number) {
		if (showDays !== 0 && newShowDays === 0) dispatch(setSelectedSlots([]));
		setShowDays(newShowDays);
	}

	return (
		<div className="top-row">
			<SessionSelectorNav allowShowDateRange />

			<ActionButtonDropdown
				label="Email host keys"
				dropdownRenderer={({ methods }) => (
					<MeetingsEmail close={methods.close} />
				)}
			/>

			<div className="control-group">
				<SelectDisplayFormat
					value={showDays}
					onChange={changeShowDays}
				/>
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
				<CopyMeetingListButton />
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default MeetingsActions;
