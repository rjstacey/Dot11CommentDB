import { Checkbox } from "dot11-components";

export function StatusesSelector({
	statuses,
	setStatuses,
}: {
	statuses: string[];
	setStatuses: (statuses: string[]) => void;
}) {
	function toggleStatus(status: string) {
		if (statuses.includes(status)) {
			setStatuses(statuses.filter((s) => s !== status));
		} else {
			setStatuses([...statuses, status]);
		}
	}
	return (
		<div>
			<label>
				<Checkbox
					checked={statuses.includes("Aspirant")}
					onChange={() => toggleStatus("Aspirant")}
				/>
				<span>Aspirant</span>
			</label>
			<label>
				<Checkbox
					checked={statuses.includes("Potential Voter")}
					onChange={() => toggleStatus("Potential Voter")}
				/>
				<span>Potential Voter</span>
			</label>
			<label>
				<Checkbox
					checked={statuses.includes("Voter")}
					onChange={() => toggleStatus("Voter")}
				/>
				<span>Voter</span>
			</label>
			<label>
				<Checkbox
					checked={statuses.includes("Non-Voter")}
					onChange={() => toggleStatus("Non-Voter")}
				/>
				<span>Non-Voter</span>
			</label>
			<label>
				<Checkbox
					checked={statuses.includes("ExOfficio")}
					onChange={() => toggleStatus("ExOfficio")}
				/>
				<span>Ex-Officio</span>
			</label>
		</div>
	);
}
