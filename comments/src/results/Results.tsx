import React from 'react';
import styled from '@emotion/styled';

import {
	AppTable, TableColumnSelector,
	ActionButton,
	ColumnProperties,
	TablesConfig,
} from 'dot11-components';

import TopRow from '../components/TopRow';
import PathBallotSelector from '../components/PathBallotSelector';
import ResultsSummary from './ResultsSummary';
import ResultsExport from './ResultsExport';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUserAccessLevel, AccessLevel } from '../store/user';
import { loadResults, clearResults, selectResultsBallotId, resultsSelectors, resultsActions, upsertTableColumns } from '../store/results';
import { selectCurrentId, selectBallot, BallotType } from '../store/ballots';

// The table row grows to the available height
const TableRow = styled.div`
	flex: 1;
	overflow: hidden; /* prevent content increasing height */
	width: 100%;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const NoWrapItem = styled.div`
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
`;

const renderItem = ({rowData, dataKey}) => <NoWrapItem>{rowData[dataKey]}</NoWrapItem>

const tableColumns: ColumnProperties[] = [
	{key: 'SAPIN',			label: 'SA PIN',		width: 75},
	{key: 'Name', 			label: 'Name',			width: 200, cellRenderer: renderItem},
	{key: 'Affiliation',	label: 'Affiliation',	width: 200, cellRenderer: renderItem},
	{key: 'Email', 			label: 'Email',			width: 250, cellRenderer: renderItem},
	{key: 'Vote', 			label: 'Vote',			width: 210},
	{key: 'CommentCount', 	label: 'Comments',		width: 110},
	{key: 'Notes', 			label: 'Notes',			width: 250,	flexShrink: 1, flexGrow: 1}
];

function getDefaultTablesConfig(access: number, type: number): TablesConfig {
	const columns = tableColumns.reduce((o, c) => {
			let columnConfig = {
				shown: true,
				width: c.width,
				unselectable: false
			};
			if (c.key === 'SAPIN' && (access < AccessLevel.admin || type === BallotType.SA)) {
				columnConfig = {...columnConfig, shown: false, unselectable: false};
			}
			if (c.key === 'Email' && access < AccessLevel.admin) {
				columnConfig = {...columnConfig, shown: false, unselectable: false};
			}
			o[c.key] = columnConfig;
			return o;
		}, {});
	console.log(columns)
	return {default: {fixed: false, columns}};
}

function updateTableConfigAction(access: number, type: number) {
	if (access < AccessLevel.admin)
		return upsertTableColumns({columns: {SAPIN: {shown: false}, Email: {shown: false}}});

	if (type === BallotType.SA)
		return upsertTableColumns({columns: {SAPIN: {shown: false}, Email: {shown: true}}});

	return upsertTableColumns({columns: {SAPIN: {shown: true}, Email: {shown: true}}});
}

const maxWidth = 1600;

function Results() {

	const access = useAppSelector(selectUserAccessLevel);
	const resultsBallot_id = useAppSelector(selectResultsBallotId);
	const currentBallot_id = useAppSelector(selectCurrentId);
	const resultsBallot = useAppSelector((state) => selectBallot(state, resultsBallot_id));
	
	const dispatch = useAppDispatch();

	const defaultTablesConfig = React.useMemo(() => {
		if (resultsBallot)
			return getDefaultTablesConfig(access, resultsBallot.Type);
	}, [access, resultsBallot]);

	React.useEffect(() => {
		if (resultsBallot)
			dispatch(updateTableConfigAction(access, resultsBallot.Type));
	}, [dispatch, access, resultsBallot]);

	React.useEffect(() => {
		if (currentBallot_id && resultsBallot_id !== currentBallot_id)
			dispatch(loadResults(currentBallot_id));
		if (!currentBallot_id && resultsBallot_id)
			dispatch(clearResults());
	}, [dispatch, currentBallot_id, resultsBallot_id]);

	const onBallotSelected = (ballot_id: number | null) => dispatch(ballot_id? loadResults(ballot_id): clearResults());
	const refresh = () => dispatch(resultsBallot_id? loadResults(resultsBallot_id): clearResults());

	return (
		<>
			<TopRow style={{maxWidth}}>
				<PathBallotSelector onBallotSelected={onBallotSelected}	/>
				<div style={{display: 'flex'}}>
					<ResultsExport ballot={resultsBallot} />
					<TableColumnSelector 
						selectors={resultsSelectors}
						actions={resultsActions}
						columns={tableColumns}
					/>
					<ActionButton
						name='refresh'
						title='Refresh'
						onClick={refresh}
					/>
				</div>
			</TopRow>
			<ResultsSummary
				style={{maxWidth}}
			/>
			<TableRow style={{maxWidth}}>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={28}
					estimatedRowHeight={32}
					selectors={resultsSelectors}
					actions={resultsActions}
				/>
			</TableRow>
		</>
	)
}

export default Results;