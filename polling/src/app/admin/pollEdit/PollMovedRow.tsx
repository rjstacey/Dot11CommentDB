import { Form, Row, Col } from "react-bootstrap";
import { Poll } from "@/store/pollingAdmin";
import MemberSelector from "@/components/MemberSelector";

export function PollMovedRow({
	poll,
	changePoll,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
}) {
	return (
		<Row className="d-flex align-items-center mb-3">
			<Col xs="auto">
				<Form.Label htmlFor="poll-moved">Moved:</Form.Label>
			</Col>
			<Col>
				<MemberSelector
					id="poll-moved"
					style={{ width: 300 }}
					value={poll.movedSAPIN}
					onChange={(movedSAPIN) => changePoll({ movedSAPIN })}
				/>
			</Col>
			<Col xs="auto">
				<Form.Label htmlFor="poll-seconded">Second:</Form.Label>
			</Col>
			<Col>
				<MemberSelector
					id="poll-seconded"
					style={{ width: 300 }}
					value={poll.secondedSAPIN}
					onChange={(secondedSAPIN) => changePoll({ secondedSAPIN })}
				/>
			</Col>
		</Row>
	);
}
