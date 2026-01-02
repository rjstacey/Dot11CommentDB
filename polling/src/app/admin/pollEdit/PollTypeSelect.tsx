import { ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import cx from "clsx";
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
	return (
		<div className={cx("d-flex align-items-center gap-2", className)}>
			<span>Poll:</span>
			<ToggleButtonGroup
				type="radio"
				name="poll-type"
				value={value}
				onChange={onChange}
				size="sm"
				vertical
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
