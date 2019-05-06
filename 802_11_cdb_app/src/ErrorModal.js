import React from 'react';
import Modal from 'react-modal';
import {connect} from 'react-redux';
import {clearUsersError} from './actions/users';
import {clearBallotsError} from './actions/ballots';
import {clearEpollsError} from './actions/epolls';
import {clearVotersError} from './actions/voters';
import {clearResultsError} from './actions/results';
import {clearCommentsError} from './actions/comments';

class ErrorModal extends React.Component {

	render() {
		var msg = null;
		var clearFunc = undefined;
		if (this.props.usersErrorMsg) {
			msg = this.props.usersErrorMsg;
			clearFunc = clearUsersError;
		}
		else if (this.props.ballotsErrorMsg) {
			msg = this.props.ballotsErrorMsg;
			clearFunc = clearBallotsError;
		}
		else if (this.props.epollsErrorMsg) {
			msg = this.props.epollsErrorMsg;
			clearFunc = clearEpollsError;
		}
		else if (this.props.votersErrorMsg) {
			msg = this.props.votersErrorMsg;
			clearFunc = clearVotersError;
		}
		else if (this.props.resultsErrorMsg) {
			msg = this.props.resultsErrorMsg;
			clearFunc = clearResultsError;
		}
		else if (this.props.commentsErrorMsg) {
			msg = this.props.commentsErrorMsg;
			clearFunc = clearCommentsError;
		}


		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={!!msg}
				appElement={document.querySelector('main')}
			>
				<p>{msg}</p>
				<button onClick={() => this.props.dispatch(clearFunc())}>OK</button>
			</Modal>
		)
	}
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