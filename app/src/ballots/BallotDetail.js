import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {useHistory, useParams} from 'react-router-dom'
import Select from 'react-dropdown-select'
import {Container, Row, Col} from 'react-grid-system'
import ConfirmModal from '../modals/ConfirmModal'
import {Checkbox, Search} from '../general/Icons'
import {renderResultsSummary, renderCommentsSummary} from './Ballots'
import {updateBallot, addBallot, getBallots, setProject} from '../actions/ballots'
import {getVotingPools} from '../actions/voters'
import {importResults, uploadResults, deleteResults} from '../actions/results'
import {importComments, uploadComments, deleteComments} from '../actions/comments'
import {shallowDiff} from '../lib/compare'

//import styles from '../css/BallotDetail.css'

function defaultBallot() {
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	return {
		Project: '',
		BallotID: '',
		EpollNum: '',
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: '',
		PrevBallotID: ''}
}

/* Convert an ISO date string to US eastern time and return string in form "YYYY-MM-DD" */
function dateToShortDate(isoDate) {
	const utcDate = new Date(isoDate)
	const date = new Date(utcDate.toLocaleString("en-US", {timeZone: "America/New_York"}))
	return date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).substr(-2) + '-' + ('0' + date.getDate()).substr(-2)
}

/* Parse date in form "YYYY-MM-DD" as US eastern time and convert to UTC ISO date string */
function shortDateToDate(shortDateStr) {
	const date = new Date(shortDateStr)	// local time
	const easternDate = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}))
	const utcDate = new Date(date.toLocaleString("en-US", {timeZone: "UTC"}))
	const diff = utcDate - easternDate
	return (date + diff).toISOString()
}

//const Row = (props) => <div css={{display: 'flex', flexDirection: 'row', margin: 'margin: 6px 0'}} {...props} />
//const Col = (props) => <div css={{display: 'flex', flexDirection: 'column'}} {...props} />

function SelectProject({project, projectList, onChange, ...otherProps}) {
	const options = projectList.map(p => ({value: p, label: p}))
	const value = options.find(o => o.value === project)
	const handleChange = (values) => onChange(values.length > 0? values[0].value: '')
	return <Select values={value? [value]: []} options={options} onChange={handleChange} create clearable searchable {...otherProps} />
}

function SelectVotingPoolId({votingPoolId, votingPools, onChange, ...otherProps}) {
	const options = votingPools.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === votingPoolId)
	const handleChange = (values) => onChange(values.length? values[0].value: '')
	return <Select	values={value? [value]: []}	options={options} onChange={handleChange} {...otherProps} />
}

function SelectPrevBallot({prevBallotId, ballotList, onChange, ...otherProps}) {
	const options = ballotList//.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === prevBallotId)
	const handleChange = (values) => onChange(values.length? values[0].value: '')
	return <Select values={value? [value]: []} options={options} onChange={handleChange} {...otherProps} />
}

const LabeledCheckbox = ({label, ...otherProps}) => <span><Checkbox {...otherProps}/><label>{label}</label></span>

/*
const GridContainer = ({rows, columns, gap, children, ...otherProps}) => {

	let newChildren = []
	React.Children.forEach(children, element => {
		if (!React.isValidElement(element)) return
		const {row, col, style, ...otherProps} = element.props
		let updatedStyle = {
			...style,
			gridRow: row,
			gridColumn: col
		}
		console.log(style, updatedStyle)
		newChildren.push(React.cloneElement(element, {...otherProps, row: undefined, col: undefined, style: updatedStyle}))
	})

	const containerStyle = {
		display: 'grid',
		gridTemplateRows: rows,
		gridTemplateColumns: columns,
		gap,
		justifyContent: 'center'
	}

	return <div style={containerStyle} {...otherProps}>{newChildren}</div>
}

const Item = ({rowPos, colPos, rowSpan, colSpan, ...otherProps}) => {
	const gridCss = css`
		grid-row: ${rowPos} ${rowSpan? '/ span ' + rowSpan: ''};
		grid-column: ${colPos} ${colSpan? '/ span ' + colSpan: ''};` 
	return <div css={gridCss} {...otherProps} />
}
*/


/*
 * Ballot detail is mounted from
 * /Ballot/:ballotId -> update an existing ballot
 * /Ballot/ -> add a new ballot
 * /ImportEpoll/:epollNum -> add a new ballot from an epoll
 */
function BallotDetail(props) {
	const {ballotId, epollNum} = useParams()
	const history = useHistory()
	const [ballot, setBallot] = React.useState(defaultBallot)
	const [resultsAction, setResultsAction] = React.useState({
		importFromEpoll: false,
		file: null,
		remove: false
	});
	const resultsFileRef = React.useRef();
	const [commentsAction, setCommentsAction] = React.useState({
		importFromEpoll: false,
		file: null,
		remove: false
	})
	const commentsFileRef = React.useRef();

	/* On mount, make sure we have the ballots and voting pools loaded */
	React.useEffect(() => {
		if (!props.ballotsValid) {
			props.getBallots()
		}
		if (!props.votingPoolsValid) {
			props.getVotingPools()
		}
	}, [])

	/* On mount or if the underlying data changes,
	 * reload the ballot from ballot data or epoll data as appropriate. */
	React.useEffect(() => {
		if (ballotId) {
			const b = props.ballots.find(b => b.BallotID === ballotId)
			if (b) {
				setBallot(b)
			}
		}
		else if (epollNum) {
			const e = props.epolls.find(e => e.EpollNum === epollNum)
			if (e) {
				const b = {
					Project: '',
					BallotID: e.BallotID,
					EpollNum: epollNum,
					Document: e.Document,
					Topic: e.Topic,
					Start: e.Start,
					End: e.End,
					VotingPoolID: 0,
					PrevBallotID: ''
				}
				setBallot(b)
			}
		}
	}, [props.ballots, props.epolls])

	function change(e) {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: value});
	}

	function handleProjectChange(project) {
		//const project = values.length > 0? values[0].value: ''
		props.setProject(project)
		setBallot({...ballot, Project: project})
	}

	function changeDate(e) {
		const {name, value} = e.target;
		const dateStr = shortDateToDate(value)
		console.log(dateStr)
		setBallot({...ballot, [name]: dateStr})
	}

	function changeType(e) {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: parseInt(value, 10)})
	}

	async function submit(e) {

		// Delete stuff first
		if (resultsAction.remove) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete results for ${ballot.BallotID}?`)
			if (!ok) {
				return
			}
			props.deleteResults(ballot.BallotID)
		}

		if (commentsAction.remove) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot.BallotID}?`)
			if (!ok) {
				return;
			}
			props.deleteComments(ballot.BallotID)
		}

		// Update or create ballot entry
		let action;
		if (ballotId) {
			const b = props.ballots.find(b => b.BallotID === ballotId)
			if (b) {
				let changed = shallowDiff(b, ballot)
				if (changed !== {}) {
					action = () => props.updateBallot(ballotId, changed)
				}
			}
		}
		else {
			action = () => props.addBallot(ballot)
		}
		if (action) {
			await action()
		}
				
		if (resultsAction.importFromEpoll) {
			props.importResults(ballot.BallotID, ballot.EpollNum)
		}
		else if (resultsAction.file) {
			props.uploadResults(ballotId, ballot.Type, resultsAction.file)
		}

		if (commentsAction.importFromEpoll) {
			props.importComments(ballot.BallotID, ballot.EpollNum, 1)
		}
		else if (commentsAction.file) {
			props.uploadComments(ballotId, ballot.Type, commentsAction.file)
		}

		/* Once we have added a ballot, we navigate there so that further changes are updates */
		if (action && !ballotId) {
			history.replace(`/Ballot/${ballot.BallotID}`)
		}
	}

	function close() {
		history.goBack()
	}


	function handleResultsRemove(e) {
		setResultsAction({
			file: null,
			importFromEpoll: false,
			remove: e.target.checked
		})
	}

	function handleResultsFromEpoll(e) {
		setResultsAction({
			file: null,
			importFromEpoll: e.target.checked,
			remove: false
		})
	}

	function handleResultsFromFile(e) {
		if (e.target.checked) {
			resultsFileRef.current.click()
		}
		else {
			setResultsAction({...resultsAction, file: null})
		}
	}

	function handleResultsFileSelected(e) {
		setResultsAction({
			file: e.target.files[0],
			importFromEpoll: false,
			remove: false
		})
	}


	function handleCommentsRemove(e) {
		setCommentsAction({
			file: null,
			importFromEpoll: false,
			remove: e.target.checked
		})
	}

	function handleCommentsFromEpoll(e) {
		setCommentsAction({
			file: null,
			importFromEpoll: e.target.checked,
			remove: false
		})
	}

	function handleCommentsFromFile(e) {
		if (e.target.checked) {
			commentsFileRef.current.click()
		}
		else {
			setCommentsAction({...commentsAction, file: null})
		}
	}

	function handleCommentsFileSelected(e) {
		setCommentsAction({
			file: e.target.files[0],
			importFromEpoll: false,
			remove: false
		})
	}

	const CommentsActions = (props) => (
			<div style={{display: 'flex', flexDirection: 'column', padding: '20px'}}>
				<span><label>Comments:&nbsp;</label>{renderCommentsSummary({rowData: ballot, dataKey: 'Comments'})}</span>
				{ballot.Comments &&
					<LabeledCheckbox
						label='Delete'
						checked={commentsAction.remove}
						onChange={handleCommentsRemove}
					/>
				}
				{ballot.EpollNum &&
					<LabeledCheckbox
						label={(ballot.Comments? 'Reimport': 'Import') + ' from ePoll'}
						checked={commentsAction.importFromEpoll}
						onChange={handleCommentsFromEpoll}
					/>
				}
				<LabeledCheckbox
					label={'Upload from ' + (commentsAction.file? commentsAction.file.name: 'file')}
					checked={commentsAction.file !== null}
					onChange={handleCommentsFromFile}
				/> 
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={commentsFileRef}
					onChange={handleCommentsFileSelected}
					style={{display: "none"}}
				/>
			</div>
		)

	const ResultsActions = (props) => (
			<div style={{display: 'flex', flexDirection: 'column', padding: '20px'}}>
				<span><label>Results:</label>&nbsp;{renderResultsSummary({rowData: ballot, dataKey: 'Results'})}</span>
				<LabeledCheckbox
					label='Delete'
					checked={resultsAction.remove}
					onChange={handleResultsRemove}
				/>
				{ballot.EpollNum &&
					<LabeledCheckbox
						label={(ballot.Results? 'Reimport': 'Import') + ' from ePoll'}
						checked={resultsAction.importFromEpoll}
						onChange={handleResultsFromEpoll}
					/> 
				}
				<LabeledCheckbox
					label={'Upload from ' + (resultsAction.file? resultsAction.file.name: 'file')}
					checked={resultsAction.file !== null}
					onChange={handleResultsFromFile}
				/>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={resultsFileRef}
					onChange={handleResultsFileSelected}
					style={{display: "none"}}
				/>
			</div>
		)

	function BallotTypes(props) {
		const ballotTypes = [
			'Comment collection',
			'Initial WG ballot',
			'Recirc WG ballot',
			'Initial SA ballot',
			'Recirc SA ballot',
			'Motion'
		]
		return (
			<div style={{display: 'flex', flexDirection: 'column', padding: '20px'}} {...props} >
				<label>Ballot Type:</label>
				{ballotTypes.map((str, i) => 
					<label key={i}><input type='radio' name='Type' value={i} checked={ballot.Type === i} onChange={changeType} />{str}</label>)}
			</div>
		)
	}

	const shortDateStart = dateToShortDate(ballot.Start)
	const shortDateEnd = dateToShortDate(ballot.End)
	return (
		<Container style={{maxWidth: '800px'}}>
			<Row>
				<Col xs={12} md={7}>
					<Row style={{margin: '10px 0'}}>
						<Col xs={4}><label>Project:</label></Col>
						<Col xs={8}>
							<SelectProject
								project={ballot.Project}
								projectList={props.projectList}
								onChange={handleProjectChange}
								css={{width: '150px'}}
							/>
						</Col>
					</Row>

					<Row style={{margin: '10px 0'}}>
						<Col xs={4}><label>Ballot ID:</label></Col>
						<Col xs={8}><Search name='BallotID' value={ballot.BallotID} onChange={change} /></Col>
					</Row>

					{(ballot.Type !== 3 && ballot.Type !== 4) &&
						<Row style={{margin: '10px 0'}}>
							<Col xs={4}><label>ePoll Number:</label></Col>
							<Col xs={8}><Search name='EpollNum' value={ballot.EpollNum} onChange={change} /></Col>
						</Row>
					}

					<Row style={{margin: '10px 0'}}>
						<Col xs={4}><label>Document:</label></Col>
						<Col xs={8}><Search name='Document' value={ballot.Document} onChange={change}/></Col>
					</Row>
				</Col>
				<Col xs={12} md={5}>
					<BallotTypes />
				</Col>
			</Row>
			<Row style={{margin: '10px 0'}}>
				<Col xs={2}><label>Topic:</label></Col>
				<Col xs={10}>
					<textarea css={{width: '400px', height: '3em'}} name='Topic' value={ballot.Topic} onChange={change} />
				</Col>
			</Row>
			<Row>
				<Col xs={12} md={7}>
					<Row style={{margin: '10px 0'}}>
						<Col xs={4}><label>Start:</label></Col>
						<Col xs={8}>
							<input type='date' name='Start' value={shortDateStart} onChange={changeDate} />
						</Col>
					</Row>
					<Row style={{margin: '10px 0'}}>
						<Col xs={4}><label>End</label></Col>
						<Col xs={8}>
							<input type='date' name='End' value={shortDateEnd} onChange={changeDate} />
						</Col>
					</Row>
					{(ballot.Type === 1 || ballot.Type === 3 || ballot.Type === 5) &&		
						<Row style={{margin: '10px 0'}}>
							<Col xs={4}><label>Voting Pool:</label></Col>
							<Col xs={8}>
								<SelectVotingPoolId 
									votingPoolId={ballot.VotingPoolID}
									votingPools={props.votingPools}
									onChange={value => setBallot({...ballot, VotingPoolID: value})}
									css={{width: '250px'}}
								/>
							</Col>
						</Row>
					}
					{(ballot.Type === 2 || ballot.Type === 4) &&
						<Row style={{margin: '10px 0'}}>
							<Col xs={4}><label>Previous Ballot:</label></Col>
							<Col xs={8}>
								<SelectPrevBallot
									prevBallotId={ballot.PrevBallotID}
									ballotList={props.ballotList}
									onChange={value => setBallot({...ballot, PrevBallotID: value})}
									css={{width: '250px'}}
								/>
							</Col>
						</Row>
					}
				</Col>
				<Col xs={12} md={5}>
					<Row>
						<Col xs={6}><ResultsActions /></Col>
						<Col xs={6}><CommentsActions /></Col>
					</Row>
				</Col>
			</Row>
			<Row>
				<button onClick={submit}>{ballotId? 'Update': 'Add'}</button>
				<button onClick={close}>Cancel</button>
			</Row>
		</Container>
	)
}

BallotDetail.propTypes = {
	ballotsValid: PropTypes.bool.isRequired,
	ballots: PropTypes.array.isRequired,
	projectList: PropTypes.array.isRequired,
	ballotList: PropTypes.array.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools: PropTypes.array.isRequired,
	epolls: PropTypes.array.isRequired,
}

export default connect(
	(state, ownProps) => {
		const {ballots, voters, epolls} = state
		return {
			ballotsValid: ballots.ballotsValid,
			ballots: ballots.ballots,
			projectList: ballots.projectList,
			ballotList: ballots.ballotList,
			votingPoolsValid: voters.votingPoolsValid,
			votingPools: voters.votingPools,
			epolls: epolls.epolls,
			loading: ballots.getBallots
		}
	},
	(dispatch, ownProps) => {
		return {
			getBallots: () => dispatch(getBallots()),
			getVotingPools: () => dispatch(getVotingPools()),
			addBallot: (ballot) => dispatch(addBallot(ballot)),
			setProject: (project) => dispatch(setProject(project)),
			updateBallot: (ballotId, ballot) => dispatch(updateBallot(ballotId, ballot)),
			deleteResults: (ballotId) => dispatch(deleteResults(ballotId)),
			importResults: (ballotId, epollNum) => dispatch(importResults(ballotId, epollNum)),
			uploadResults: (ballotId, ballotType, file) => dispatch(uploadResults(ballotId, ballotType, file)),
			deleteComments: (ballotId) => dispatch(deleteComments(ballotId)),
			importComments: (ballotId, epollNum) => dispatch(importComments(ballotId, epollNum, 1)),
			uploadComments: (ballotId, ballotType, file) => dispatch(uploadComments(ballotId, ballotType, file))
		}
	}
)(BallotDetail)
