import PropTypes from 'prop-types';
import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import Draggable from 'react-draggable';
import BallotSelector from './BallotSelector';
import {setResultsSort, setResultsFilters, getResults} from './actions/results'
import {setBallotId} from './actions/ballots'
import {sortClick, filterValidate} from './filter'
import {IconSort} from './Icons'
import styles from './AppTable.css'
import {saveAs} from 'file-saver'
var axios = require('axios');



class ExportModal extends React.Component {

	static propTypes = {
		ballot: PropTypes.object.isRequired,
		isOpen: PropTypes.bool.isRequired,
		close: PropTypes.func.isRequired,
		appElement: PropTypes.any
	}

	constructor(props) {
		super(props)
		this.state = {
			forProject: false
		}
	}

	submit = (e) => {
		const ballotId = this.props.ballot.BallotID
		const project = this.props.ballot.Project
		const forProject = this.state.forProject
		const params = forProject? {Project: project}: {BallotID: ballotId}
		axios.get('/results/export', {params, responseType: 'blob'})
			.then((response) => {
				if (response.status === 200) {
					const filename = (forProject? project: ballotId) + ' results.xlsx'
					saveAs(response.data, filename)
				}
				this.props.close()
			})
			.catch((error) => {
				console.log(error)
				this.props.close()
			})
	}

	render() {
		const ballotId = this.props.ballot.BallotID
		const project = this.props.ballot.Project
		const forProject = this.state.forProject
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Export results for:</p>
				<label><input
					className={styles.checkbox}
					type="radio"
					title={ballotId}
					checked={!forProject}
					onChange={e => {this.setState({forProject: !forProject})}}
				/>This ballot {ballotId}</label>
				<label><input
					className={styles.checkbox}
					type="radio"
					title={project}
					checked={forProject}
					onChange={e => {this.setState({forProject: !forProject})}}
				/>This project {project}</label>
				<button onClick={this.submit}>OK</button>
				<button onClick={this.props.close}>Cancel</button>
			</Modal>
		)
	}
}

function getResultsSummary(resultsSummary, ballot, votingPoolSize) {
	const r = resultsSummary, b = ballot
	var rs = {
		opened: '',
		closed: '',
		duration: '',
		votingPoolSize: votingPoolSize,

		approvalRate: null,
		approvalRateStr: '',
		approve: null,
		disapprove: null,
		abstain: null,

		invalidVote: null,
		invalidDisapprove: null,
		invalidAbstain: null,

		returns: null,
		returnsPct: null,
		returnsPctStr: '',
		returnsReqStr: '',
		abstainsPct: null,
		abstainsPctStr: '',
		abstainsReqStr: ''
	}
	if (b.Start && b.End) {
		const dStart = new Date(b.Start);
		rs.opened = dStart.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'});
		const dEnd = new Date(b.End);
		rs.closed = dEnd.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'})
		const _MS_PER_DAY = 1000 * 60 * 60 * 24;
		const dur = Math.floor((dEnd - dStart) / _MS_PER_DAY);
		if (!isNaN(dur)) {
			rs.duration = `${dur} days`
		}
	}

	if (r) {
		var pct = parseFloat(r.Approve/(r.Approve+r.Disapprove));
		if (!isNaN(pct)) {
			rs.approvalRate = pct
			rs.approvalRateStr = `${(100*pct).toFixed(1)}%`
		}
		rs.approve = r.Approve
		rs.disapprove = r.Disapprove
		rs.abstain = r.Abstain
		rs.invalidVote = r.InvalidVote
		rs.invalidDisapprove = r.InvalidDisapprove
		rs.invalidAbstain = r.InvalidAbstain
		rs.returns = r.TotalReturns;
		pct = parseFloat(rs.returns/r.ReturnsPoolSize);
		if (!isNaN(pct)) {
			rs.returnsPct = pct
			rs.returnsPctStr = `${(100*pct).toFixed(1)}%`
			rs.returnsReqStr = (rs.returnsPct > 0.5? 'Meets': 'Does not meet') + ' return requirement (>50%)'
		}
		pct = parseFloat(r.Abstain/votingPoolSize);
		if (!isNaN(pct)) {
			rs.abstainsPct = pct
			rs.abstainsPctStr = `${(100*pct).toFixed(1)}%`;
			rs.abstainsReqStr = (rs.abstainsPct < 0.3? 'Meets': 'Does not meet') + ' abstain requirement (<30%)'
		}
	}

	return rs
}

class ResultsSummary extends React.PureComponent {

	static propTypes = {
		visible: PropTypes.bool.isRequired,
		resultsSummary: PropTypes.object.isRequired,
		ballot: PropTypes.object.isRequired,
		votingPoolSize: PropTypes.number.isRequired
	}

	render() {
		const {visible} = this.props
		const r = getResultsSummary(this.props.resultsSummary, this.props.ballot, this.props.votingPoolSize)

		var style = {
			container: {
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'space-arround',
			},
			col: {
				display: 'flex',
				flexDirection: 'column',
				paddingRight: '10px'
			},
			lv: {
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'space-between'
			},
			title: {display: 'block', fontWeight: 'bold', margin: '5px 0 5px 0'}
		}
		return (
			<div id='results-summary' style={{...style.container, display: visible? 'flex': 'none'}}>
				<div style={{...style.col, flex: '1 1 160px'}}>
					<div style={style.title}>Ballot</div>
					<div style={style.lv}><span>Opened:</span><span>{r.opened}</span></div>
					<div style={style.lv}><span>Closed:</span><span>{r.closed}</span></div>
					<div style={style.lv}><span>Duration:</span><span>{r.duration}</span></div>
					<div style={style.lv}><span>Voting pool:</span><span>{r.votingPoolSize}</span></div>
				</div>
				<div style={{...style.col, flex: '1 1 160px'}}>
					<div style={style.title}>Result</div>
					<div style={style.lv}><span>Approval rate:</span><span>{r.approvalRateStr}</span></div>
					<div style={style.lv}><span>Approve:</span><span>{r.approve}&nbsp;</span></div>
					<div style={style.lv}><span>Disapprove:</span><span>{r.disapprove}&nbsp;</span></div>
					<div style={style.lv}><span>Abstain:</span><span>{r.abstain}&nbsp;</span></div>
				</div>
				<div style={{...style.col, flex: '1 1 180px'}}>
					<div style={style.title}>Invalid votes</div>
					<div style={style.lv}><span>Not in pool:</span><span>{r.invalidVote}</span></div>
					<div style={style.lv}><span>Disapprove without comment:</span><span>{r.invalidDisapprove}</span></div>
					<div style={style.lv}><span>Abstain reason:</span><span>{r.invalidAbstain}</span></div>
				</div>
				<div style={{...style.col, flex: '1 1 220px'}}>
					<div style={style.title}>Other criteria</div>
					<div style={style.lv}><span>Total returns:</span><span>{r.returns}</span></div>
					<div style={style.lv}><span>Returns as % of pool:</span><span>{r.returnsPctStr}</span></div>
					<div>{r.returnsReqStr}</div>
					<div style={style.lv}><span>Abstains as % of returns:</span><span>{r.abstainsPctStr}</span></div>
					<div>{r.abstainsReqStr}</div>
				</div>
			</div>
		)
	}
}

class Results extends React.PureComponent {
	constructor(props) {

		super(props);

		this.columns = [
			{dataKey: 'SAPIN',		label: 'SA PIN',		width: 75},
			//{dataKey: 'LastName',	label: 'Last Name', 	width: 150},
			//{dataKey: 'FirstName',	label: 'First Name', 	width: 150},
			//{dataKey: 'MI',			label: 'MI',			width: 50},
			{dataKey: 'Name',		label: 'Name', 			width: 200},
			{dataKey: 'Affiliation', label: 'Affiliation', 	width: 200},
			{dataKey: 'Email',		label: 'Email',			width: 250},
			{dataKey: 'Vote',		label: 'Vote',			width: 210},
			{dataKey: 'CommentCount', label: 'Comments',	width: 110},
			{dataKey: 'Notes',		label: 'Notes',			width: 250, flexShrink: 1, flexGrow: 1, isLast: true}
		];

		this.state = {
			windowHeight: 400.0,
			windowWidth: 400.0,
			headerHeight: 100.0,
			resultsHeight: 140.0,
			showSummary: true
		}

		// List of filterable columns
		const filterable = ['SAPIN', 'Name', 'Affiliation', 'Email', 'Vote', 'CommentCount', 'Notes'];
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			filterable.forEach(dataKey => {filters[dataKey] = ''});
			this.props.dispatch(setResultsFilters(filters));
		}
		this.sortable = filterable;

		this.state.showExportModal = false
	}

	componentDidMount() {
		this.updateDimensions()
		window.addEventListener("resize", this.updateDimensions);

		const ballotId = this.props.match.params.ballotId;
		//console.log(ballotId, this.props.ballotId)
		if (this.props.ballotId !== ballotId && (this.props.ballotId || ballotId)) {
			if (ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				this.props.dispatch(setBallotId(ballotId))
				this.props.dispatch(getResults(ballotId))
			}
			else {
				// Routed here with parameter ballotId unspecified, but we have a ballotId stored
				// Redirect to the stored ballotId
				this.props.history.replace(`/Results/${this.props.ballotId}`)
				console.log(`/Results/${this.props.ballotId}`)
				this.props.dispatch(getResults(this.props.ballotId))
			}
		}
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.updateDimensions);
	}

	updateDimensions = () => {
		const headerEl = document.getElementsByTagName('header')[0];
		const topRowEl = document.getElementById('top-row');
		const resultsEl = document.getElementById('results-summary');
		this.setState({
			windowHeight: window.innerHeight,
			windowWidth: window.innerWidth,
			headerHeight: headerEl.offsetHeight + topRowEl.offsetHeight,
			resultsHeight: resultsEl.offsetHeight
		})
	}

	resizeColumn = ({dataKey, deltaX}) => {
		var i = this.columns.findIndex(c => c.dataKey === dataKey)
		this.columns[i].width += deltaX;
		this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width}})})
	}

	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setResultsSort(sortBy, sortDirection));
	}
	filterChange = (event, dataKey) => {
		var filter = filterValidate(dataKey, event.target.value)
		this.props.dispatch(setResultsFilters({[dataKey]: filter}));
	}
	ballotSelected = (ballotId) => {
		// Redirect to results page with selected ballot
		this.props.history.push(`/Results/${ballotId}`)
		this.props.dispatch(getResults(ballotId));
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
				type='text'
				className={classNames}
				placeholder='Filter'
				onChange={e => {this.filterChange(e, dataKey)}}
				value={filter && filter.filtStr}
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
		return <div className={styles.noRows}>{this.props.getResults? 'Loading...': 'No rows'}</div>
	}

	rowClassName = ({index}) => {
		if (index < 0) {
			return styles.headerRow;
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}
	}

	rowGetter = ({index}) => {
		return this.props.resultsData[this.props.resultsDataMap[index]]
	}

	renderTable = () => {
		//console.log('render ', this.state.width, this.state.height)
		var height = this.state.windowHeight - this.state.headerHeight - 1;
		var width = this.state.windowWidth - 1;
		if (this.state.showSummary) {
			height -= this.state.resultsHeight;
		}
		return (
			<Table
				className={styles.Table}
				rowHeight={20}
				height={height}
				width={width}
				headerHeight={40}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.props.resultsDataMap.length}
				rowGetter={this.rowGetter}
			>
				{this.columns.map((col, index) => {
					const {headerRenderer, ...otherProps} = col;
					return (
						<Column 
							key={index}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							{...otherProps}
						/>
				)})}
			</Table>
		)
	}

	render() {
		return (
			<div id='Results'>
				<div id='top-row'>
					<BallotSelector
						onBallotSelected={this.ballotSelected}
					/>
					<span
						style={{cursor: 'pointer'}}
						onClick={() => {this.setState({showSummary: !this.state.showSummary})}}
					><i className={this.state.showSummary? "fa fa-angle-down": "fa fa-angle-right"} />Results</span>
					<button onClick={() => {this.setState({showExportModal: true})}}>Export</button>
					<span>{this.props.resultsDataMap.length}</span>
				</div>
				<ResultsSummary
					visible={this.state.showSummary}
					resultsSummary={this.props.resultsSummary}
					ballot={this.props.ballot}
					votingPoolSize={this.props.votingPoolSize}
				/>
				{this.renderTable()}
				<ExportModal
					ballot={this.props.ballot}
					isOpen={this.state.showExportModal}
					close={() => this.setState({showExportModal: false})}
					appElement={document.querySelector('#Results')}
				/>
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {ballots, results} = state;
	return {
		filters: results.filters,
		sortBy: results.sortBy,
		sortDirection: results.sortDirection,
		ballotId: ballots.ballotId,
		ballot: results.ballot,
		votingPoolSize: results.votingPoolSize,
		resultsData: results.resultsData,
		resultsDataMap: results.resultsDataMap,
		resultsSummary: results.resultsSummary,
		getResults: results.getResults,
	}
}
export default connect(mapStateToProps)(Results);