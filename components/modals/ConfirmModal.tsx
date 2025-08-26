import * as React from "react";
import { Modal, Button } from "react-bootstrap";

let resolve: (value: unknown) => void;

type ConfirmModalProps = {};

type ConfirmModalState = {
	isOpen: boolean;
	message: string;
	hasCancel: boolean;
};

class ConfirmModal extends React.Component<
	ConfirmModalProps,
	ConfirmModalState
> {
	static instance: any;

	constructor(props: ConfirmModalProps) {
		super(props);
		ConfirmModal.instance = this;
		console.log("instantiate");

		this.state = {
			isOpen: false,
			message: "",
			hasCancel: true,
		};
	}

	static show(message: string, hasCancel = true) {
		console.log("show", ConfirmModal.instance);
		ConfirmModal.instance.setState({ isOpen: true, message, hasCancel });

		return new Promise((res) => {
			resolve = res;
		});
	}

	handleOk = () => {
		this.setState({ isOpen: false });
		resolve(true);
	};

	handleCancel = () => {
		this.setState({ isOpen: false });
		resolve(false);
	};

	render() {
		return (
			<Modal show={this.state.isOpen} onHide={this.handleCancel}>
				<Modal.Body>
					<p>{this.state.message}</p>
				</Modal.Body>
				<Modal.Footer>
					{this.state.hasCancel && (
						<Button variant="secondary" onClick={this.handleCancel}>
							Cancel
						</Button>
					)}
					<Button variant="primary" onClick={this.handleOk}>
						{this.state.hasCancel ? "Yes" : "OK"}
					</Button>
				</Modal.Footer>
			</Modal>
		);
	}
}

export default ConfirmModal;
