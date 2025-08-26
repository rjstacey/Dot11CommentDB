import React from "react";
import { AppModal } from ".";

import { Icon } from "../icons";
import { Button } from "../form";

interface ActionButtonModalProps
	extends Omit<React.ComponentProps<typeof AppModal>, "isOpen"> {
	name?: string;
	label?: string;
	title?: string;
	disabled?: boolean;
	onRequestOpen?: () => void;
	onRequestClose?: () => void;
	children?: React.ReactNode;
}

export type ChildProps = {
	isOpen: boolean;
	close: () => void;
};

function ActionButtonModal({
	name,
	label,
	title,
	disabled,
	children,
	onRequestOpen,
	onRequestClose,
	...rest
}: ActionButtonModalProps) {
	const [isOpen, setOpen] = React.useState(false);

	const open = () => {
		if (onRequestOpen) onRequestOpen();
		setOpen(true);
	};

	const close = () => {
		if (onRequestClose) onRequestClose();
		setOpen(false);
	};

	return (
		<>
			<Button
				name={name}
				title={title}
				disabled={disabled}
				onClick={isOpen ? close : open}
			>
				{label ? label : <Icon type={name} />}
			</Button>
			<AppModal {...rest} isOpen={isOpen} onRequestClose={close}>
				{React.Children.map(children, (child) =>
					React.isValidElement(child)
						? React.cloneElement(
								child as React.ReactElement<ChildProps>,
								{ isOpen, close }
						  )
						: child
				)}
			</AppModal>
		</>
	);
}

export default ActionButtonModal;
