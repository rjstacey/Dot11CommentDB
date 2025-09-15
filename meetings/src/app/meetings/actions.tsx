import { useParams } from "react-router";
import { Row, Col, Button } from "react-bootstrap";
import { SplitPanelButton, TableColumnSelector } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	meetingsSelectors,
	meetingsActions,
	selectUiProperties,
	setUiProperties,
	setSelectedSlots,
} from "@/store/meetings";

import SessionSelectorNav from "@/components/SessionSelectorNav";

import { EmailMeetingHostKeys } from "./MeetingsEmail";
import { DisplayFormatSelect } from "./DisplayFormatSelect";
import CopyMeetingListButton from "./CopyMeetingList";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";

function MeetingsActions() {
	const dispatch = useAppDispatch();
	const params = useParams();
	const sessionNumber =
		"sessionNumber" in params ? Number(params.sessionNumber) : null;

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

			{sessionNumber !== null && (
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
			)}

			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<DisplayFormatSelect
					value={showDays}
					onChange={changeShowDays}
					disabled={sessionNumber === null}
				/>

				<EmailMeetingHostKeys disabled={sessionNumber === null} />

				<CopyMeetingListButton disabled={sessionNumber === null} />

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
