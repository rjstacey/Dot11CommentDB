import { Form } from "react-bootstrap";
import cx from "clsx";
import { PollVotersType } from "@/store/pollingAdmin";

export function PollVotersSelect({
	value,
	onChange,
	disabled,
	className,
}: {
	value: PollVotersType;
	onChange: (value: PollVotersType) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<div className={cx("d-flex align-items-center gap-2", className)}>
			<span>Voters:</span>
			<Form.Group>
				<Form.Check
					type="radio"
					id="poll-voters-type-anyone"
					checked={value === PollVotersType.ANYONE}
					onChange={() => onChange(PollVotersType.ANYONE)}
					disabled={disabled}
					label="Anyone"
				/>
				<Form.Check
					type="radio"
					id="poll-voters-type-voter"
					checked={value === PollVotersType.VOTER}
					onChange={() => onChange(PollVotersType.VOTER)}
					disabled={disabled}
					label="Voters"
				/>
				<Form.Check
					type="radio"
					id="poll-voters-type-voter-potential-voter"
					checked={value === PollVotersType.VOTER_POTENTIAL_VOTER}
					onChange={() =>
						onChange(PollVotersType.VOTER_POTENTIAL_VOTER)
					}
					disabled={disabled}
					label="Voters & Potential Voters"
				/>
			</Form.Group>
		</div>
	);
}
