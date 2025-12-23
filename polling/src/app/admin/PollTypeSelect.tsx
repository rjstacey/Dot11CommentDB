import { ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import cx from "classnames";
import type { PollType } from "@/store/pollingAdmin";

export function PollTypeSelect({
	value,
	onChange,
	disabled,
	className,
}: {
	value: PollType;
	onChange: (value: PollType) => void;
	disabled?: boolean;
	className?: string;
}) {
	console.log("value=", value, disabled);

	return (
		<div className={cx("d-flex align-items-center me-3", className)}>
			<span className="me-2">Poll:</span>
			<ToggleButtonGroup
				type="radio"
				name="poll-type"
				value={value}
				onChange={(value) => {
					console.log("change=", value);
					onChange(value as PollType);
				}}
			>
				<ToggleButton
					id="poll-type-motion"
					value="m"
					variant={"outline-primary"}
					disabled={disabled}
				>
					{"Motion"}
				</ToggleButton>
				<ToggleButton
					id="poll-type-strawpoll"
					value="sp"
					variant="outline-success"
					disabled={disabled}
				>
					{"Strawpoll"}
				</ToggleButton>
			</ToggleButtonGroup>
		</div>
	);
}
