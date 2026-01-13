import { Form, Row, Col } from "react-bootstrap";
import type { Poll } from "@/store/pollingAdmin";
import MemberSelector from "@/components/MemberSelector";
import css from "@/components/poll-layout.module.css";

export function PollMovedRow({
	poll,
	changePoll,
	readOnly,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
	readOnly?: boolean;
}) {
	return (
		<Row className={css["poll-moved-row"]}>
			<Form.Group as={Col} className={css["poll-moved-col"]}>
				<Form.Label htmlFor="poll-moved">Moved:</Form.Label>
				<MemberSelector
					id="poll-moved"
					style={{ width: 300 }}
					value={poll.movedSAPIN}
					onChange={(movedSAPIN) => changePoll({ movedSAPIN })}
					readOnly={readOnly}
					isInvalid={!poll.movedSAPIN}
				/>
				<Form.Control.Feedback type="invalid">
					Select member as mover
				</Form.Control.Feedback>
			</Form.Group>
			<Form.Group as={Col} className={css["poll-moved-col"]}>
				<Form.Label htmlFor="poll-seconded">Second:</Form.Label>
				<div className="d-flex flex-column">
					<MemberSelector
						id="poll-seconded"
						style={{ width: 300 }}
						value={poll.secondedSAPIN}
						onChange={(secondedSAPIN) =>
							changePoll({ secondedSAPIN })
						}
						readOnly={readOnly}
						isInvalid={!poll.secondedSAPIN}
					/>
					<Form.Control.Feedback tooltip type="invalid">
						Select member as seconder
					</Form.Control.Feedback>
				</div>
			</Form.Group>
		</Row>
	);
}
