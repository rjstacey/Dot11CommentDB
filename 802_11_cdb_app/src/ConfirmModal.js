import React from 'react';
import AppModal from './AppModal';

let resolve;

class ConfirmModal extends React.Component {
	constructor(props) {
		super(props)
		ConfirmModal.instance = this;

		this.state = {
			isOpen: false,
			message: ''
		}
	}

	static show(msg) {
		ConfirmModal.instance.setState({isOpen: true, message: msg})

		return new Promise(res => {resolve = res})
	}

	handleOk = () => {
		this.setState({isOpen: false});
		resolve(true);
	}

	handleCancel = () => {
		this.setState({isOpen: false});
		resolve(false);
	}

	render() {
		return (
			<AppModal
				isOpen={this.state.isOpen}
				onRequestClose={this.handleCancel}
			>
				<p>{this.state.message}</p>
				<button onClick={this.handleOk}>OK</button>
				<button onClick={this.handleCancel}>Cancel</button>
			</AppModal>
		)
	}
}

export default ConfirmModal;