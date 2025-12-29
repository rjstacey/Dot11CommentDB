import { ToggleButtonGroup, ToggleButton } from "react-bootstrap";
import cx from "classnames";
import { PollRecordType } from "@/store/pollingAdmin";

export function PollRecordSelect({
	value,
	onChange,
	disabled,
	className,
}: {
	value: PollRecordType;
	onChange: (value: PollRecordType) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<div className={cx("d-flex align-items-center me-3", className)}>
			<span className="me-2">Result:</span>
			<ToggleButtonGroup
				type="radio"
				name="poll-record-type"
				value={value}
				onChange={(value) => {
					console.log("change=", value);
					onChange(value as PollRecordType);
				}}
			>
				<ToggleButton
					type="radio"
					id="poll-record-type-anonymous"
					value={PollRecordType.ANONYMOUS}
					variant="outline-info"
					disabled={disabled}
				>
					{"Anonymous"}
				</ToggleButton>
				<ToggleButton
					id="poll-record-type-admin-view"
					value={PollRecordType.ADMIN_VIEW}
					variant="outline-info"
					disabled={disabled}
				>
					{"Admin view"}
				</ToggleButton>
				<ToggleButton
					type="radio"
					id="poll-record-type-recorded"
					value={PollRecordType.RECORDED}
					variant="outline-info"
					disabled={disabled}
				>
					{"Recorded"}
				</ToggleButton>
			</ToggleButtonGroup>
		</div>
	);
}
