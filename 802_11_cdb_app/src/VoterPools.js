import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import DatePicker from 'react-datepicker';
import Voters from './Voters'
import {setVotingPoolSort, setVotingPoolFilter, getVotingPool, addVotingPool, deleteVotingPool, uploadVoters} from './actions/voters'
import {sortClick, allSelected, toggleVisible, SortIndicator, DeleteIcon, AddIcon, RefreshIcon} from './filter'
import styles from './AppTable.css'



class AddVotingPoolModal extends React.PureComponent {
	constructor(props) {
		super(props)
		this.state = {
			wasOpen: props.isOpen,
			votingPool: {VotingPoolID: 0, Name: '', Date: new Date()}
		}
	}
	static getDerivedStateFromProps(props, state) {
		// Reset userData to default on each open
		var newState = {};
		if (props.isOpen && !state.wasOpen) {
			newState.votingPool = {VotingPoolID: 0, Name: '', Date: new Date()};
		}
		newState.wasOpen = props.isOpen;
		return newState;
	}
	change = (e) => {
		this.setState({votingPool: Object.assign({}, this.state.votingPool, {[e.target.name]: e.target.value})});
	}
	submit = (votingPool) => {
		this.props.dispatch(addVotingPool(this.state.votingPool))
		this.props.close()
	}
	render() {
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Add voters pool</p>
				<label>Pool Name:<input type='text' name='Name' value={this.state.votingPool.Name} onChange={this.change}/></label><br />
				<label>Pool Date:<DatePicker selected={this.state.votingPool.Date} onChange={newDate => this.setState({votingPool: {Date: newDate}})} /></label>
				<button onClick={this.submit}>OK</button>
				<button onClick={this.props.close}>Cancel</button>
			</Modal>
		)
	}
}

class ImportVotersModal extends React.PureComponent {
	constructor(props) {
		super(props)
		this.votersFileInputRef = React.createRef();
	}
	submit = () => {
		this.props.dispatch(uploadVoters(this.props.votingPool.VotingPoolID, this.votersFileInputRef.current.files[0]));
	}
	render() {
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Import voters list for {this.props.votingPool.Name}</p>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={this.votersFileInputRef}
				/>
				<br />
				<button onClick={this.submit}>OK</button>
				<button onClick={this.props.close}>Cancel</button>
			</Modal>
		)
	}
}

class VoterPools extends React.PureComponent {
	constructor(props) {
		super(props);

		this.columns = [
			{dataKey: '',				label: '',
				width: 40,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
			{dataKey: 'VotingPoolID',	label: 'ID',
				width: 100},
			{dataKey: 'Name',			label: 'Voting Pool',
				width: 200},
			{dataKey: 'Date',			label: 'Date',
				width: 200,
				cellRenderer: this.renderDate},
			{dataKey: 'VoterCount',		label: 'Voters',
				width: 200,
				cellRenderer: this.renderVotersCount},
			{dataKey: '',				label: '',
				width: 200,
				headerRenderer: this.renderHeaderActions,
				cellRenderer: this.renderActions}
		];

		this.state = {
			height: 100,
			width: 100,
			selectedRows: [],
			votingPool: {VotingPoolID: 0, Name: '', Date: new Date()},
			showVotersImport: false,
			showAddVotingPool: false,
			showVoters: false
		}

		// List of filterable columns
    	const filterable = ['Name'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setVotingPoolFilter(dataKey, ''));
			});
		}

		this.sortable = ['Name', 'Date', 'VoterCount'];
	}

	componentDidMount() {
		this.updateDimensions()
		window.addEventListener("resize", this.updateDimensions);
		if (!this.props.votingPoolValid) {
			this.props.dispatch(getVotingPool())
		}
	}
	componentWillUnmount() {
		window.removeEventListener("resize", this.updateDimensions);
	}
	updateDimensions = () => {
		var header = document.getElementsByTagName('header')[0]
		var top = document.getElementById('top-row')
		var height = window.innerHeight - header.offsetHeight - top.offsetHeight - 5
		var width = window.innerWidth - 1; //parent.offsetWidth
		//console.log('update ', width, height)
		this.setState({height, width})
	}
	
	deleteVotersClick = (e, rowData) => {
		console.log('VotingPoolID=', rowData.VotingPoolID)
		this.props.dispatch(deleteVotingPool(rowData.VotingPoolID));
	}
	importVotersClick = (e, rowData) => {
		this.setState({
			votingPool: rowData,
			showVotersImport: true
		})
	}
	showVoters = ({event, rowData}) => {
		this.setState({
			votingPool: rowData,
			showVoters: true
		})
	}
	refresh = () => {
		this.props.dispatch(getVotingPool());
	}

	handleRemoveSelected = () => {
		const data = this.props.votingPoolData;
		const dataMap = this.props.votingPoolDataMap;
		var ids = [];
		for (var i = 0; i < dataMap.length; i++) { // only select checked items that are visible
			let id = data[dataMap[i]].VotingPoolID
			if (this.state.selectedRows.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			this.props.dispatch(deleteVotingPool(ids))
		}
	}
	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setVotingPoolSort(sortBy, sortDirection));
		event.preventDefault();
	}
	filterChange = (event, dataKey) => {
		this.props.dispatch(setVotingPoolFilter(dataKey, event.target.value));
	}

	renderActions = ({rowIndex}) => {
		return (
			<DeleteIcon className={styles.actionColumn} width={22} height={22} onClick={() => this.deleteRow(rowIndex)}/>
		)
	}
	renderHeaderActions = ({rowIndex}) => {
		return (
			<div title='Actions'>
				<RefreshIcon width={22} height={22} title='Refresh' onClick={this.refresh} />
				<AddIcon width={22} height={22} onClick={() => this.setState({showAddUserModal: true})}/>
			</div>
		)
	}
	renderSortLabel = (props) => {
		const {dataKey, label, style} = props;
		const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE'
		return (
			<span
				key={'label-' + dataKey}
				title={label}
				onClick={e => this.sortChange(e, dataKey)}
				style={{cursor: 'pointer', userSelect: 'none', ...style}}
			>
				{label}
				<SortIndicator sortDirection={sortDirection} />
			</span>
		);
	}
	renderLabel = (props) => {
		const {label, style} = props;
		return (
			<span
				key={'label-' + label}
				title={label}
				style={style}
			>
				{label}
			</span>
		);
	}
	renderFilter = (dataKey) => {
		return (
			<input
				key={'filt-' + dataKey}
				type='text'
				className={styles.headerFilt}
				placeholder='Filter'
				onChange={e => this.filterChange(e, dataKey)}
				value={this.props.filters[dataKey]}
				style={{width: '100%'}}
			/>
		);
	}
	renderHeaderCell = ({dataKey, label}) => {
		const labelElement = this.sortable.includes(dataKey)? this.renderSortLabel({dataKey, label}): this.renderLabel({label});
		const showFilter = this.props.filters.hasOwnProperty(dataKey)
		return (
			<div>
				{labelElement}
				{showFilter && this.renderFilter(dataKey)}
			</div>
		);
	}
	renderHeaderCheckbox = ({dataKey}) => {
		const {selectedRows} = this.state;
		const {votingPoolData, votingPoolDataMap} = this.props;
		const checked = allSelected(selectedRows, votingPoolDataMap, votingPoolData, 'VotingPoolID');
		return (
			<input
				type="checkbox"
				checked={checked}
				onChange={e => this.setState({selectedRows: toggleVisible(selectedRows, votingPoolDataMap, votingPoolData, 'VotingPoolID')})}
			/>
		);
	}
	renderCheckbox = ({rowIndex, rowData, dataKey, parent}) => {
		const id = rowData.VotingPoolID;
		return (
			<input
				type="checkbox"
				checked={this.state.selectedRows.includes(id)}
				onChange={e => {
					// if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
					let i = this.state.selectedRows.indexOf(id);
					this.setState({
						selectedRows: update(this.state.selectedRows, (i > -1)? {$splice: [[i, 1]]}: {$push: [id]})
					})
				}}
			/>
		);
	}
	renderDate = ({rowData, dataKey}) => {
		// rowData[dataKey] is a UTC time string. We convert this to eastern time
		// and display only the date (not time).
		var d = new Date(rowData[dataKey]).toISOString().slice(0, 10)
		//var str = d.slice(0, 10)
		//var str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
		return (
			<div
				dangerouslySetInnerHTML={{__html: d}}
			/>
		)
	}
	renderVotersCount = ({rowIndex, rowData, dataKey}) => {
		var count = rowData[dataKey];
		if (count > 0) {
			return (
				<div>
					<span>{count}</span>
					<button onClick={(e) => {return this.deleteVotersClick(e, rowData)}}>Delete</button>
				</div>
			)
		}
		else {
			return (
				<button onClick={(e) => {return this.importVotersClick(e, rowData)}}>Import</button>
			)
		}
	}
	noRowsRenderer = () => {
		return <div className={styles.noRows}>{this.props.getVotingPool? 'Loading...': 'No rows'}</div>
	}

	rowClassName = ({index}) => {
		if (index < 0) {
			return styles.headerRow;
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}
	}

	renderTable = () => {
		if (this.lastRenderedWidth !== this.state.width) {
			this.lastRenderedWidth = this.state.width
		}

		return (

			<Table
				className={styles.Table}
				height={this.state.height}
				width={this.state.width}
				rowHeight={22}
				headerHeight={40}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.props.votingPoolDataMap.length}
				rowGetter={({index}) => {return this.props.votingPoolData[this.props.votingPoolDataMap[index]]}}
				onRowDoubleClick={this.showVoters}
			>
				{this.columns.map((col, index) => {
					const {headerRenderer, ...otherProps} = col;
					return (
						<Column 
							key={index}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							{...otherProps}
						/>
				)})}
			</Table>
		)
	}

	render() {
		if (this.state.showVoters) {
			return (
				<Voters
					votingPool={this.state.votingPool}
					close={() => {this.setState({showVoters: false})}}
				/>
			)
		}
		return (
			<div id='VoterPools' style={{height: '100%'}}>
				<div id='top-row'>
					<button disabled={this.props.getVotingPool} onClick={this.refresh}>Refresh</button>
					<button onClick={this.handleRemoveSelected}>Remove Selected</button>
					<button onClick={() => this.setState({showAddVotingPool: true})}>Add</button>
				</div>
				{this.renderTable()}
				<AddVotingPoolModal
					isOpen={this.state.showAddVotingPool}
					close={() => this.setState({showAddVotingPool: false})}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#VoterPools')}
				/>
				<ImportVotersModal
					votingPool={this.state.votingPool}
					isOpen={this.state.showVotersImport}
					close={() => this.setState({showVotersImport: false})}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#VoterPools')}
				/>
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {voters} = state;
	return {
		filters: voters.votingPoolFilters,
		sortBy: voters.votingPoolSortBy,
		sortDirection: voters.votingPoolSortDirection,
		votingPoolData: voters.votingPoolData,
		votingPoolDataMap: voters.votingPoolDataMap,
		getVotingPool: voters.getVotingPool,
		addVotingPool: voters.addVotingPool,
	}
}
export default connect(mapStateToProps)(VoterPools);