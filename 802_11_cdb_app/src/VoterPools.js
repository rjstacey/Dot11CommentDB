import React from 'react';
import Modal from 'react-modal';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {setVotingPoolSort, setVotingPoolFilter, getVotingPool, addVotingPool, deleteVotingPool, uploadVoters} from './actions/voters'
import {sortClick} from './filter'
import styles from './AppTable.css'

class AddVotingPoolModal extends React.PureComponent {
	constructor(props) {
		super(props)
		this.state = {
			wasOpen: props.isOpen,
			votingPool: {VotingPoolID: 0, Name: '', Date: new Date()}
		}
		this.votersFileInputRef = React.createRef();
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
		this.setState({votingPool: {...this.state.votingPool, [e.target.name]: e.target.value}});
	}
	changeDate = date => {
		this.setState({votingPool: {...this.state.votingPool, Date: date}})
	}
	submit = () => {
		var file = this.votersFileInputRef.current.files[0];
		this.props.dispatch(addVotingPool(this.state.votingPool))
			.then(() => {
				if (file) {
					return this.props.dispatch(uploadVoters(this.state.votingPool.VotingPoolID, file))
				}
				else {
					return Promise.resolve()
				}
			})
			.then(this.props.close)
	}
	render() {
		const style = {
			label: {display: 'inline-block', textAlign: 'left', width: '100px'}
		}
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Add voters pool</p>
				<label style={style.label}>Pool Name:</label>
					<input type='text' name='Name' value={this.state.votingPool.Name} onChange={this.change}/><br />
				<label style={style.label}>Voters:</label>
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={this.votersFileInputRef}
					/>
				<br />
				<p>
					<button onClick={this.submit}>OK</button>
					<button onClick={this.props.close}>Cancel</button>
				</p>
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
		this.props.dispatch(uploadVoters(this.props.votingPool.VotingPoolID, this.votersFileInputRef.current.files[0])).then(this.props.close)
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
			{dataKey: 'VotingPoolID',	label: 'ID',
				width: 100},
			{dataKey: 'Name',			label: 'Voting Pool',
				width: 200},
			{dataKey: 'VoterCount',		label: 'Voters',
				width: 100},
			{dataKey: '',				label: '',
				width: 100,
				headerRenderer: this.renderHeaderActions,
				cellRenderer: this.renderActions}
		];

		this.maxWidth = this.columns.reduce((acc, col) => acc + col.width, 0)
		console.log(this.maxWidth)

		this.state = {
			height: 100,
			width: 100,
			selectedRows: [],
			votingPool: {VotingPoolID: 0, Name: ''},
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
		this.sortable = ['Name', 'VoterCount'];
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
		this.setState({height, width: Math.min(width, this.maxWidth)})
	}
	deleteVotingPool = (rowData) => {
		console.log('VotingPoolID=', rowData.VotingPoolID)
		this.props.dispatch(deleteVotingPool(rowData.VotingPoolID));
	}
	importVotersClick = (rowData) => {
		this.setState({
			votingPool: rowData,
			showVotersImport: true
		})
	}
	showVoters = ({event, rowData}) => {
		this.props.history.push(`/Voters/${rowData.VotingPoolID}`)
	}
	refresh = () => {
		this.props.dispatch(getVotingPool());
	}

	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setVotingPoolSort(sortBy, sortDirection));
		event.preventDefault();
	}
	filterChange = (event, dataKey) => {
		this.props.dispatch(setVotingPoolFilter(dataKey, event.target.value));
	}

	renderActions = ({rowIndex, rowData}) => {
		return (
			<div className={styles.actionColumn}>
				<span className="fa fa-file-upload" title='Upload' onClick={() => this.importVotersClick(rowData)} />&nbsp;
				<span className="fa fa-trash-alt" title='Delete' onClick={() => this.deleteVotingPool(rowData)}/>
			</div>
		)
	}
	renderHeaderActions = ({rowIndex}) => {
		return (
			<div title='Actions'>
				<span className="fa fa-sync-alt" title='Refresh' onClick={this.refresh} />&nbsp;
				<span className="fa fa-plus" title='Add' onClick={() => this.setState({showAddVotingPool: true})} />
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
				{sortDirection === 'NONE' || <i className={sortDirection === 'ASC'? "fa fa-sort-alpha-down": "fa fa-sort-alpha-up"} />}
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
				style={{width: '90%'}}
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
				headerHeight={44}
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
		return (
			<div id='VoterPools'>
				<div id='top-row'>
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