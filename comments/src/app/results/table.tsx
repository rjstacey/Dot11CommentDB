import React from "react";
import { AppTable, ShowFilters, SplitPanel, Panel } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	fields,
	selectResultsBallot_id,
	resultsSelectors,
	resultsActions,
	upsertTableColumns,
	selectResultsAccess,
} from "@/store/results";
import { selectBallot, BallotType } from "@/store/ballots";

import { ResultsDetail } from "./detail";
import { tableColumns, getDefaultTablesConfig } from "./tableColumns";

function updateTableConfigAction(access: number, type: number) {
	if (access < AccessLevel.admin)
		return upsertTableColumns({
			columns: { SAPIN: { shown: false }, Email: { shown: false } },
		});

	if (type === BallotType.SA)
		return upsertTableColumns({
			columns: { SAPIN: { shown: false }, Email: { shown: true } },
		});

	return upsertTableColumns({
		columns: { SAPIN: { shown: true }, Email: { shown: true } },
	});
}

const maxWidth = 1600;

function Results() {
	const dispatch = useAppDispatch();

	const access = useAppSelector(selectResultsAccess);
	const resultsBallot_id = useAppSelector(selectResultsBallot_id);
	const resultsBallot = useAppSelector((state) =>
		resultsBallot_id ? selectBallot(state, resultsBallot_id) : undefined
	);

	const defaultTablesConfig = React.useMemo(() => {
		if (resultsBallot)
			return getDefaultTablesConfig(access, resultsBallot.Type);
	}, [access, resultsBallot]);

	React.useEffect(() => {
		if (resultsBallot)
			dispatch(updateTableConfigAction(access, resultsBallot.Type));
	}, [dispatch, access, resultsBallot]);

	if (!resultsBallot) return null;

	return (
		<>
			<ShowFilters
				style={{ maxWidth }}
				selectors={resultsSelectors}
				actions={resultsActions}
				fields={fields}
			/>

			<SplitPanel selectors={resultsSelectors} actions={resultsActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={52}
						estimatedRowHeight={32}
						selectors={resultsSelectors}
						actions={resultsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<ResultsDetail
						access={access}
						readOnly={access < AccessLevel.admin}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Results;
