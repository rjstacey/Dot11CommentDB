import { ToggleButton } from "react-bootstrap";
import cx from "classnames";

export function PollActivate({
	value,
	onChange,
	disabled,
	className,
}: {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<div className={cx("d-flex align-items-center me-3", className)}>
			<ToggleButton
				type="checkbox"
				name="poll-activate"
				id="poll-activate"
				value="poll-active"
				variant={"outline-success"}
				checked={value}
				onChange={(e) => onChange(e.target.checked)}
				disabled={disabled}
			>
				<i className={cx(value ? "bi-eye" : "bi-eye-slash", "me-2")} />
				{value ? "Shown" : "Unshown"}
			</ToggleButton>
		</div>
	);
}
