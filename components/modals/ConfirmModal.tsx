import React from "react";
import { Form } from "../form";
import { AppModal } from ".";

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

		this.state = {
			isOpen: false,
			message: "",
			hasCancel: true,
		};
	}

	static show(message: string, hasCancel = true) {
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
			<AppModal
				overlayStyle={{ zIndex: 20 }}
				isOpen={this.state.isOpen}
				onRequestClose={this.handleCancel}
			>
				<Form
					submit={this.handleOk}
					submitLabel={this.state.hasCancel ? "Yes" : "OK"}
					cancel={
						this.state.hasCancel ? this.handleCancel : undefined
					}
					cancelLabel="No"
				>
					<p>{this.state.message}</p>
				</Form>
			</AppModal>
		);
	}
}

export default ConfirmModal;
