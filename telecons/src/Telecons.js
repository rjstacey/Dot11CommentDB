import PropTypes from 'prop-types'
import React from 'react'
import {connect, useDispatch, useSelector} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButton, ButtonGroup} from 'dot11-components/icons'
import {displayDate, displayTime} from 'dot11-components/lib'
import {ConfirmModal} from 'dot11-components/modals'
import AppTable, {SplitPanel, Panel, SelectHeader, SelectCell, TableColumnHeader, ShowFilters, TableColumnSelector, TableViewSelector} from 'dot11-components/table'
import {fields, loadTelecons, addTelecons, deleteTelecons} from './store/telecons'
import WebexAccountSelector from './WebexAccountSelector'
import {setProperty} from 'dot11-components/store/ui'
import TeleconUpdate from './TeleconUpdate'
import TeleconAdd from './TeleconAdd'

const group = '802.11';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const columns = [
	{label: 'Day',
	getValue: entry => days[entry.Start.getDay()]},
	{label: 'Date',
	getValue: entry => displayDate(entry.Start)},
	{label: 'Time',
	getValue: entry => displayTime(entry.Start)},
	{label: 'Duration',
	getValue: entry => entry.Duration},
	{label: 'Webex',
	getValue: entry => entry.webex_id},
	{label: 'Motions',
	getValue: entry => entry.HasMotions},
]

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const Container = styled.div`
	padding: 10px;
`;

const NotAvailable = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

function TeleconDetail() {
	const [actionAdd, setActionAdd] = React.useState(false)
	const dispatch = useDispatch();
	const loading = useSelector(state => state[dataSet].loading);
	const selected = useSelector(state => state[dataSet].selected);
	const uiProperties = useSelector(state => state[dataSet].ui);
	const setUiProperty = React.useCallback((property, value) => dispatch(setProperty(property, value)), [dispatch]);

	const handleRemoveSelected = React.useCallback(async () => {
		const ok = await ConfirmModal.show(`Are you sure you want to delete ${selected}?`);
		if (!ok)
			return;
		await dispatch(deleteTelecons(selected));
	}, [dispatch, selected]);

	const disableButtons = loading;
	return (
		<Container>
			<TopRow>
					<span>
						<ActionButton
							name='add'
							title='Add telecon'
							disabled={disableButtons}
							isActive={actionAdd}
							onClick={() => setActionAdd(!actionAdd)}
						/>
						<ActionButton
							name='edit'
							title='Edit telecon'
							disabled={disableButtons}
							isActive={uiProperties.edit}
							onClick={() => setUiProperty('edit', !uiProperties.edit)}
						/>
						<ActionButton
							name='delete'
							title='Delete telecon'
							disabled={disableButtons}
							onClick={handleRemoveSelected}
						/>
					</span>
			</TopRow>
			{loading?
				<NotAvailable>Loading...</NotAvailable>:
				(actionAdd?
					<TeleconAdd 
						close={() => setActionAdd(false)}
					/>:
					selected.length === 0?
						<NotAvailable>Nothing selected</NotAvailable>:
						<TeleconUpdate
							key={selected}
							loading={loading}
							readOnly={!uiProperties.edit}
						/>)
			}
		</Container>
	)
}

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'Subgroup',
		label: 'Subgroup',
		width: 200, flexGrow: 1, flexShrink: 0},
	{key: 'Day',
		label: 'Day',
		width: 200, flexGrow: 1, flexShrink: 0,
		cellRenderer: ({rowData, dataKey}) => days[rowData.Start.getDay()]},
	{key: 'Date',
		label: 'Date',
		width: 200, flexGrow: 1, flexShrink: 0,
		cellRenderer: ({rowData, dataKey}) => displayDate(rowData.Start)},
	{key: 'Time',
		label: 'Time',
		width: 200, flexGrow: 1, flexShrink: 0,
		cellRenderer: ({rowData, dataKey}) => displayTime(rowData.Start)},
	{key: 'Duration',
		width: 200, flexGrow: 1, flexShrink: 0,
		...fields.Duration},
	{key: 'HasMotions',
		width: 40, flexGrow: 1, flexShrink: 0,
		...fields.HasMotions}
];

function Telecons({telecons, valid, loading, selected, loadTelecons, uiProperties, setUiProperty}) {

	React.useEffect(() => {
		if (!loading)
			loadTelecons(group);
	}, []);

	const refresh = () => {
		loadTelecons(group);
	}


	return <>
		<TopRow>
			<div style={{display: 'flex', alignItems: 'center'}}>
				<ButtonGroup>
					<div style={{textAlign: 'center'}}>Table view</div>
					<div style={{display: 'flex', alignItems: 'center'}}>
						<TableViewSelector dataSet={dataSet} />
						<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
						<ActionButton
							name='book-open'
							title='Show detail'
							isActive={uiProperties.showDetail} 
							onClick={() => setUiProperty('showDetail', !uiProperties.showDetail)} 
						/>
					</div>
				</ButtonGroup>
				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
			</div>
		</TopRow>

		<ShowFilters
			dataSet={dataSet}
			fields={fields}
		/>

		<SplitPanel splitView={uiProperties.showDetail || false} >
			<Panel>
				<AppTable
					columns={tableColumns}
					headerHeight={62}
					estimatedRowHeight={64}
					dataSet={dataSet}
				/>
			</Panel>
			<Panel>
				<TeleconDetail
					key={selected}
					loading={loading}
					uiProperties={uiProperties}
				/>
			</Panel>
		</SplitPanel>
	</>
}

const dataSet = 'telecons';

Telecons.propTypes = {
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
}

export default connect(
	(state) => {
		const data = state[dataSet];

		return {
			valid: data.valid,
			loading: data.loading,
			selected: data.selected,
			tableView: data.ui.tableView,
			tablesConfig: data.ui.tablesConfig,
			uiProperties: data.ui
		}
	},
	{
		loadTelecons,
		setUiProperty: (property, value) => setProperty(dataSet, property, value),
	}
)(Telecons);
