import {
    Container,
    Row,
    Col,
} from "react-bootstrap";

import CommentHistory from "./CommentHistory";

export function CommentHistoryDetail({
    contentButton
}: {
    contentButton: React.ReactNode
}) {
    return (
        <Container fluid="lg">
            <Row>
                <Col className="d-flex justify-content-end gap-2">
                    {contentButton}
                </Col>
            </Row>
            <div className="main"><CommentHistory /></div>
        </Container>
    );
}
