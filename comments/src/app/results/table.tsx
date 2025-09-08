import React from "react";
import { Button } from "react-bootstrap";
import { AppTable, ShowFilters } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	fields,
	selectResultsBallot_id,
	resultsSelectors,
	resultsActions,
	upsertTableColumns,
	selectResultsAccess,
	type Result,
} from "@/store/results";
import { selectBallot, BallotType } from "@/store/ballots";

import { ResultEditModal } from "./ResultEdit";
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

	const [editResult, setEditResult] = React.useState<Result | null>(null);

	const columns = React.useMemo(() => {
		return tableColumns.map((col) => {
			if (col.key === "Action") {
				col = {
					...col,
					cellRenderer: (props) => (
						<Button
							variant="secondary-outline"
							className="bi-pencil"
							onClick={() => setEditResult(props.rowData)}
						/>
					),
				};
			}
			return col;
		});
	}, [setEditResult]);

	if (!resultsBallot) return null;

	return (
		<>
			<ShowFilters
				style={{ maxWidth }}
				selectors={resultsSelectors}
				actions={resultsActions}
				fields={fields}
			/>
			<div className="table-container">
				<AppTable
					fitWidth
					fixed
					defaultTablesConfig={defaultTablesConfig}
					columns={columns}
					headerHeight={38}
					estimatedRowHeight={32}
					selectors={resultsSelectors}
					actions={resultsActions}
				/>
			</div>
			<ResultEditModal
				ballot={resultsBallot}
				result={editResult}
				close={() => setEditResult(null)}
			/>
		</>
	);
}

export default Results;
