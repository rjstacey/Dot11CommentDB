import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { PDFViewer, PDFViewerRef, DocumentManagerPlugin, ScrollPlugin, AnnotationPlugin, PdfAnnotationSubtype, PdfAnnotationBorderStyle, PdfAnnotationObject } from '@embedpdf/react-pdf-viewer';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCommentsState, CommentResolution, selectCommentsBallot } from "@/store/comments";
import { type Ballot, openCurrentDraft } from "@/store/ballots";

function commentAnnotation(comment: CommentResolution, ballot: Ballot | undefined): PdfAnnotationObject {
	const pageLine = comment.Page ? comment.Page : 0;
	const pageNumber = Math.floor(pageLine);
	const lineNumber = (pageLine - Math.floor(pageLine)) * 100;

	const lineStart = 60;
	const lineEnd = 710;
	const nLines = 65;
	const lineSpacing = (lineEnd - lineStart) / nLines;
	const x = 50;
	const y = lineStart + lineNumber * lineSpacing;
	const size = { width: 10, height: 10 };

	const contents = `Comment:\n${comment.Comment}\n\nProposed Change:\n${comment.ProposedChange}`;

	return {
		id: uuid(),
		type: PdfAnnotationSubtype.CIRCLE,
		pageIndex: pageNumber - 1,
		rect: { origin: { x, y }, size },
		color: "red",
		strokeColor: "red",
		strokeWidth: 0.5,
		strokeStyle: PdfAnnotationBorderStyle.SOLID,
		opacity: 1,
		author: comment.CommenterName,
		created: ballot?.End ? new Date(ballot.End) : new Date(Date.now()),
		contents,
		flags: ["readOnly"],
	};
}

export function DraftDetail() {
	const dispatch = useAppDispatch();
	const viewerRef = useRef<PDFViewerRef>(null);
	const { selected, entities } = useAppSelector(selectCommentsState);
	const ballot = useAppSelector(selectCommentsBallot);
	const comments = useMemo(() => selected.map((id) => entities[id]!).filter(Boolean), [selected, entities]);
	const [isReady, setIsReady] = useState(false);
	const annotationsRef = useRef<PdfAnnotationObject[]>([]);

	useEffect(() => {
		console.log("mount");
		return () => {
			console.log("unmount");
		}
	}, []);

	const onViewerReady = useCallback(async () => {
		console.log("Viewer ready");
		const registry = await viewerRef.current?.registry;
		const docManager = registry
			?.getPlugin<DocumentManagerPlugin>('document-manager')
			?.provides()
		if (!docManager) return;

		setIsReady(false);
		docManager.onDocumentOpened(async (doc) => {
			console.log(`Opened: ${doc.name} (${doc.id})`);
			const registry = await viewerRef.current?.registry;
			const scroll = registry
				?.getPlugin<ScrollPlugin>('scroll')
				?.provides()
			if (!scroll) return;

			scroll.onLayoutReady(() => {
				setIsReady(true);
			});
		});
		docManager.onDocumentClosed(async (doc) => {
			console.log(`Closed: ${doc}`);
			setIsReady(false);
		});

		docManager.onDocumentError((error) => {
			console.error(`Error opening document:`, error);
		});

		const file = await dispatch(openCurrentDraft());
		console.log("open draft", file)
		if (file) {
			docManager.openDocumentBuffer({
				buffer: await file.arrayBuffer(),
				name: file.name,
				autoActivate: true
			});
		}
	}, []);

	useLayoutEffect(() => {
		async function updateAnnotations() {
			const registry = await viewerRef.current?.registry;
			const annotate = registry
				?.getPlugin<AnnotationPlugin>('annotation')
				?.provides()
			if (!annotate) return;

			annotationsRef.current.forEach((a) => annotate.deleteAnnotation(a.pageIndex, a.id));
			annotationsRef.current = comments.map(c => commentAnnotation(c, ballot));
			annotationsRef.current.forEach(a => annotate.createAnnotation(a.pageIndex, a))

			const scroll = registry
				?.getPlugin<ScrollPlugin>('scroll')
				?.provides()
			if (!scroll) return;
			const a = annotationsRef.current[0];
			if (a)
				scroll.scrollToPage({ pageNumber: a.pageIndex + 1, behavior: 'instant' });

		}
		if (isReady) updateAnnotations();
	}, [comments, ballot, isReady]);

	return (
		<PDFViewer
			ref={viewerRef}
			className="d-flex w-100 flex-grow-1 overflow-auto"
			onReady={onViewerReady}
			config={{
				theme: { preference: 'light' },
				disabledCategories: ['annotation', 'print', 'export', 'insert', 'form', 'redaction']
			}}
		/>
	);
}