import { Form } from "react-bootstrap";
import cx from "clsx";
import { PollRecordType } from "@/store/pollingAdmin";

export function PollRecordSelect({
	value,
	onChange,
	disabled,
	readOnly,
	className,
}: {
	value: PollRecordType;
	onChange: (value: PollRecordType) => void;
	disabled?: boolean;
	readOnly?: boolean;
	className?: string;
}) {
	return (
		<div
			className={cx(
				"d-flex align-items-center gap-2",
				readOnly && "pe-none",
				className
			)}
		>
			<span>Result:</span>
			<Form.Group>
				<Form.Check
					type="radio"
					id="poll-result-anonymous"
					checked={value === PollRecordType.ANONYMOUS}
					onChange={() => onChange(PollRecordType.ANONYMOUS)}
					disabled={disabled}
					label="Anonymous"
				/>
				<Form.Check
					type="radio"
					id="poll-result-admin-view"
					checked={value === PollRecordType.ADMIN_VIEW}
					onChange={() => onChange(PollRecordType.ADMIN_VIEW)}
					disabled={disabled}
					label="Admin view"
				/>
				<Form.Check
					type="radio"
					id="poll-result-recorded"
					checked={value === PollRecordType.RECORDED}
					onChange={() => onChange(PollRecordType.RECORDED)}
					disabled={disabled}
					label="Recorded"
				/>
			</Form.Group>
		</div>
	);
}
