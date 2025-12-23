import { ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import cx from "classnames";
import { PollChoice } from "@/store/pollingAdmin";

export function PollVotingChoiceSelect({
	value,
	onChange,
	disabled,
	className,
}: {
	value: PollChoice;
	onChange: (value: PollChoice) => void;
	disabled?: boolean;
	className?: string;
}) {
	console.log("value=", value, disabled);

	return (
		<div className={cx("d-flex align-items-center me-3", className)}>
			<span className="me-2">Voting choice:</span>
			<ToggleButtonGroup
				type="radio"
				name="poll-voting-choice"
				value={value}
				onChange={(value) => {
					console.log("change=", value);
					onChange(value as PollChoice);
				}}
			>
				<ToggleButton
					id="poll-voting-choice-single"
					value={PollChoice.SINGLE}
					variant={"outline-warning"}
					disabled={disabled}
				>
					<i className="bi-check me-2" />
					{"Select one"}
				</ToggleButton>
				<ToggleButton
					id="poll-voting-choice-multiple"
					value={PollChoice.MULTIPLE}
					variant="outline-warning"
					disabled={disabled}
				>
					<i className="bi-check-all me-2" />
					{"Select many"}
				</ToggleButton>
			</ToggleButtonGroup>
		</div>
	);
}
