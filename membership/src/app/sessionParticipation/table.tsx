import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	SplitPanel,
	Panel,
	TableColumnSelector,
	SplitPanelButton,
} from "@components/table";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	fields,
	sessionParticipationSelectors,
	sessionParticipationActions,
	selectSessionParticipationSelected,
	setSessionParticipationSelected,
} from "@/store/sessionParticipation";

import { MemberDetail } from "../members/detail";
import { useTableColumns, useDefaultTablesConfig } from "./tableColumns";

export function SessionParticipationTableActions() {
	const tableColumns = useTableColumns();
	return (
		<>
			<TableColumnSelector
				selectors={sessionParticipationSelectors}
				actions={sessionParticipationActions}
				columns={tableColumns}
			/>
			<SplitPanelButton
				selectors={sessionParticipationSelectors}
				actions={sessionParticipationActions}
			/>
		</>
	);
}

export function SessionParticipationTable() {
	const dispatch = useAppDispatch();

	const selected = useAppSelector(selectSessionParticipationSelected);

	const columns = useTableColumns();
	const defaultTablesConfig = useDefaultTablesConfig();

	return (
		<>
			<Row className="align-items-center w-100">
				<Col>
					<ShowFilters
						selectors={sessionParticipationSelectors}
						actions={sessionParticipationActions}
						fields={fields}
					/>
				</Col>
				<Col xs={3} sm={2}>
					<GlobalFilter
						selectors={sessionParticipationSelectors}
						actions={sessionParticipationActions}
					/>
				</Col>
			</Row>

			<SplitPanel
				selectors={sessionParticipationSelectors}
				actions={sessionParticipationActions}
			>
				<Panel>
					<AppTable
						columns={columns}
						headerHeight={56}
						estimatedRowHeight={50}
						selectors={sessionParticipationSelectors}
						actions={sessionParticipationActions}
						defaultTablesConfig={defaultTablesConfig}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberDetail
						selected={selected}
						setSelected={(ids) =>
							dispatch(setSessionParticipationSelected(ids))
						}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}
