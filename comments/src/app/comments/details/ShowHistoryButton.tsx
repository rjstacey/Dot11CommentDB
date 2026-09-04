
import { Button } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";

export function ShowHistoryButton(
    {
        showHistory,
        setShowHistory,
    }: {
        showHistory: boolean;
        setShowHistory: (show: boolean) => void;
    }
) {
    const isOnline = useAppSelector(selectIsOnline);

    return (
        <Button
            id="toggle-detail-history"
            variant="outline-warning"
            value="history"
            onClick={() => setShowHistory(!showHistory)}
            active={showHistory}
            disabled={!isOnline}
        >
            <i className="bi-clock-history me-1" />
            {"History"}
        </Button>
    );
}