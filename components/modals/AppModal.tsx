import * as React from "react";
import Modal from "react-modal";

import "./AppModal.css";

Modal.setAppElement("#root");
Modal.defaultStyles = { content: undefined, overlay: undefined };

function AppModal({
	style: content,
	overlayStyle: overlay,
	...props
}: {
	style?: React.CSSProperties;
	overlayStyle?: React.CSSProperties;
} & Omit<React.ComponentProps<typeof Modal>, "style">) {
	const modalStyle = {
		content,
		overlay,
	};
	return <Modal style={modalStyle} {...props} />;
}

export default AppModal;
