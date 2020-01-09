import React from 'react';
import {connect} from 'react-redux';
import AppModal from './AppModal';
import {clearUsersError} from './actions/users';
import {clearBallotsError} from './actions/ballots';
import {clearEpollsError} from './actions/epolls';
import {clearVotersError} from './actions/voters';
import {clearResultsError} from './actions/results';
import {clearCommentsError} from './actions/comments';

function ErrorModal(props) {
	var msg = null;
	var clearFunc = undefined;
	if (props.usersErrorMsg) {
		msg = props.usersErrorMsg;
		clearFunc = clearUsersError;
	}
	else if (props.ballotsErrorMsg) {
		msg = props.ballotsErrorMsg;
		clearFunc = clearBallotsError;
	}
	else if (props.epollsErrorMsg) {
		msg = props.epollsErrorMsg;
		clearFunc = clearEpollsError;
	}
	else if (props.votersErrorMsg) {
		msg = props.votersErrorMsg;
		clearFunc = clearVotersError;
	}
	else if (props.resultsErrorMsg) {
		msg = props.resultsErrorMsg;
		clearFunc = clearResultsError;
	}
	else if (props.commentsErrorMsg) {
		msg = props.commentsErrorMsg;
		clearFunc = clearCommentsError;
	}

	return (
		<AppModal
			isOpen={!!msg}
			onRequestClose={() => props.dispatch(clearFunc())}
		>
			<p>{msg}</p>
			<button onClick={() => props.dispatch(clearFunc())}>OK</button>
		</AppModal>
	)
}

function mapStateToProps(state) {
	const {users, ballots, epolls, voters, results, comments} = state
	return {
		usersErrorMsg: users.errorMsgs.length? users.errorMsgs[0]: null,
		votersErrorMsg: voters.errorMsgs.length? voters.errorMsgs[0]: null,
		ballotsErrorMsg: ballots.errorMsgs.length? ballots.errorMsgs[0]: null,
		epollsErrorMsg: epolls.errorMsgs.length? epolls.errorMsgs[0]: null,
		resultsErrorMsg: results.errorMsgs.length? results.errorMsgs[0]: null,
		commentsErrorMsg: comments.errorMsgs.length? comments.errorMsgs[0]: null
	}
}
export default connect(mapStateToProps)(ErrorModal);