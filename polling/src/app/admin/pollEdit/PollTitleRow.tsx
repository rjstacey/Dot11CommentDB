export function PollTitleRow({
	value,
	onChange,
	disabled,
	readOnly,
}: {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	readOnly?: boolean;
}) {
	return (
		<div className="poll-title-row">
			<div className="poll-title">
				<input
					className={readOnly ? "pe-none" : undefined}
					id="poll-title"
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					readOnly={readOnly}
					tabIndex={readOnly ? -1 : undefined}
				/>
			</div>
		</div>
	);
}
