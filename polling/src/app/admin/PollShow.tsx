import { ToggleButton } from "react-bootstrap";
import cx from "classnames";

export function PollShow({
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
			<span className="me-2">This poll is:</span>
			<ToggleButton
				type="checkbox"
				name="poll-show"
				id="poll-show"
				value="published"
				variant={"outline-success"}
				checked={value}
				onChange={(e) => onChange(e.target.checked)}
				disabled={disabled}
			>
				<i className={cx(value ? "bi-eye" : "bi-eye-slash", "me-2")} />
				{value ? "Shown" : "Hidden"}
			</ToggleButton>
		</div>
	);
}
