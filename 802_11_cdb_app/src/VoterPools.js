import PropTypes from 'prop-types';
import React, {useState, useRef} from 'react';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import update from 'immutability-helper';
import Draggable from 'react-draggable';
import AppModal from './AppModal';
import {setVotingPoolSort, setVotingPoolFilters, getVotingPool, addVotingPool, deleteVotingPool, uploadVoters} from './actions/voters'
import {sortClick, filterValidate} from './filter'
import {IconRefresh, IconAdd, IconDelete, IconImport, IconSort} from './Icons'
import styles from './AppTable.css'

function AddVotingPoolModal(props) {
	const defaultVotingPool = {VotingPoolID: 0, Name: '', Date: new Date()}
	const [votingPool, setVotingPool] = useState(defaultVotingPool)
	const votersFileInputRef = useRef();

	function onOpen() {
		setVotingPool(defaultVotingPool);	// Reset votinPool data to default on each open
	}

	function change(e) {
		setVotingPool({...votingPool, [e.target.name]: e.target.value});
	}
	//function changeDate(date) {
	//	setVotingPool({...votingPool, Date: date})
	//}
	function submit() {
		var file = votersFileInputRef.current.files[0];
		props.dispatch(addVotingPool(votingPool))
			.then(() => {
				if (file) {
					return props.dispatch(uploadVoters(votingPool.VotingPoolID, file))
				}
				else {
					return Promise.resolve()
				}
			})
			.then(props.close)
	}
	const style = {
		label: {display: 'inline-block', textAlign: 'left', width: '100px'}
	}
	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<p>Add voters pool</p>
			<label style={style.label}>Pool Name:</label>
				<input type='text' name='Name' value={votingPool.Name} onChange={change}/><br />
			<label style={style.label}>Voters:</label>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={votersFileInputRef}
				/>
			<br />
			<p>
				<button onClick={submit}>OK</button>
				<button onClick={props.close}>Cancel</button>
			</p>
		</AppModal>
	)
}
AddVotingPoolModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	dispatch: PropTypes.func.isRequired
}

function ImportVotersModal(props) {
	const votersFileInputRef = useRef();

	function submit() {
		props.dispatch(uploadVoters(props.votingPool.VotingPoolID, votersFileInputRef.current.files[0])).then(props.close)
	}
	return (
		<AppModal
			isOpen={props.isOpen}
			onRequestClose={props.close}
		>
			<p>Import voters list for {props.votingPool.Name}</p>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={votersFileInputRef}
			/>
			<br />
			<button onClick={submit}>OK</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
ImportVotersModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPool: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
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
				cellRenderer: this.renderActions,
				isLast: true}
		];

		this.maxWidth = this.columns.reduce((acc, col) => acc + col.width, 0)
		console.log(this.maxWidth)

		var columnWidth = {};
		this.columns.forEach(col => {
			if (col.dataKey) {
				columnWidth[col.dataKey] = col.width
			}
		});

		this.state = {
			columnWidth,
			height: 100,
			width: 100,
			selectedRows: [],
			votingPool: {VotingPoolID: 0, Name: ''},
			showVotersImport: false,
			showAddVotingPool: false,
			showVoters: false
		}

		// List of filterable columns
    	const filterable = ['Name', 'VoterCount'];
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			filterable.forEach(dataKey => {filters[dataKey] = ''});
			this.props.dispatch(setVotingPoolFilters(filters));
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
	resizeColumn = ({dataKey, deltaX}) => {
		var i = this.columns.findIndex(c => c.dataKey === dataKey)
		this.columns[i].width += deltaX;
		this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width}})})
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
		var filter = filterValidate(dataKey, event.target.value)
		this.props.dispatch(setVotingPoolFilters({[dataKey]: filter}));
	}

	renderActions = ({rowIndex, rowData}) => {
		return (
			<div className={styles.actionColumn}>
				<IconImport title='Import' onClick={() => this.importVotersClick(rowData)} />&nbsp;
				<IconDelete title='Delete' onClick={() => this.deleteVotingPool(rowData)} />
			</div>
		)
	}
	renderHeaderActions = ({rowIndex}) => {
		return (
			<div title='Actions'>
				<IconRefresh title='Refresh' onClick={this.refresh} />&nbsp;
				<IconAdd title='Add Voter Pool' onClick={() => this.setState({showAddVotingPool: true})} />
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
	renderLabel = ({dataKey, label}) => {
		if (this.sortable.includes(dataKey)) {
			const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE';
			return (
				<div
					className={styles.headerLabel}
					title={label}
					style={{cursor: 'pointer'}}
					onClick={e => this.sortChange(e, dataKey)}
				>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'NONE'? '100%': 'calc(100% - 13px)'}}>{label}</div>
					{sortDirection !== 'NONE' && <IconSort direction={sortDirection} />}
				</div>
			)
		}
		else {
			return (
				<div
					className={styles.headerLabel}
					title={label}
				>
					{label}
				</div>
			)
		}
	}

	renderFilter = ({dataKey}) => {
		var filter = this.props.filters[dataKey]
		var classNames = styles.headerFilt
		if (filter && !filter.valid) {
			classNames += ' ' + styles.headerFiltInvalid
		}
		return (
			<input
				type='search'
				className={classNames}
				placeholder='Filter'
				onChange={e => {this.filterChange(e, dataKey)}}
				value={filter.filtStr}
			/>
		)
	}

	renderHeaderCell = ({columnData, dataKey, label}) => {
		const col = columnData;
		const showFilter = this.props.filters.hasOwnProperty(dataKey);

		if (col.isLast) {
			return (
				<div className={styles.headerLabelBox} style={{flex: '0 0 100%'}}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</div>
			)
		}
		return (
			<React.Fragment>
				<div className={styles.headerLabelBox} style={{flex: '0 0 calc(100% - 12px)'}}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</div>
				<Draggable
					axis="x"
					defaultClassName={styles.headerDrag}
					defaultClassNameDragging={styles.dragHandleActive}
					onDrag={(event, {deltaX}) => this.resizeColumn({dataKey, deltaX})}
					position={{x: 0}}
					zIndex={999}
				>
					<span className={styles.dragHandleIcon}>⋮</span>
				</Draggable>
			</React.Fragment>
		)
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
					const {headerRenderer, width, ...otherProps} = col;
					return (
						<Column 
							key={index}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							width={this.state.columnWidth[col.dataKey]? this.state.columnWidth[col.dataKey]: width}
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