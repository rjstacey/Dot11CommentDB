import * as React from "react";
import { Modal, Button } from "react-bootstrap";

class ConfirmModal extends React.Component<
	{},
	{
		show: boolean;
		message: string;
		hasCancel: boolean;
	}
> {
	static instance: ConfirmModal | undefined;
	static resolve: (value: unknown) => void;

	constructor() {
		super({});
		ConfirmModal.instance = this;

		this.state = {
			show: false,
			message: "",
			hasCancel: true,
		};
	}

	static show(message: string, hasCancel = true) {
		if (!ConfirmModal.instance)
			return Promise.reject(new Error("ConfirmModal not mounted"));
		ConfirmModal.instance.setState({ show: true, message, hasCancel });

		return new Promise((res) => {
			ConfirmModal.resolve = res;
		});
	}

	handleOk = () => {
		this.setState({ show: false });
		ConfirmModal.resolve(true);
	};

	handleCancel = () => {
		this.setState({ show: false });
		ConfirmModal.resolve(false);
	};

	render() {
		return (
			<Modal show={this.state.show} onHide={this.handleCancel}>
				<Modal.Header>
					<Modal.Title>Alert</Modal.Title>
				</Modal.Header>
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
