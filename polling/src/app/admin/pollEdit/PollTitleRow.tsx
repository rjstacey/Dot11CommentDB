import css from "@/components/poll-layout.module.css";

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
		<div className={css["poll-title-row"]}>
			<div className={css["poll-title"]}>
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
