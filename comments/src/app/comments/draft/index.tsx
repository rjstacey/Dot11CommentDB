import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { PDFViewer, PDFViewerRef, DocumentManagerPlugin, ScrollPlugin, AnnotationPlugin, PdfAnnotationSubtype, PdfAnnotationBorderStyle, PdfAnnotationObject, DocumentManagerCapability, ScrollCapability } from '@embedpdf/react-pdf-viewer';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCommentsState, CommentResolution, selectCommentsBallot } from "@/store/comments";
import { type Ballot, openDraft } from "@/store/ballots";

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

type DocState = {
	id: string | null;
	ballot_id: number | null;
	name: string;
	isReady: boolean;
};
const docStateNull = { id: null, ballot_id: null, name: "", isReady: false };

type Plugins = {
	docManager: ReturnType<DocumentManagerPlugin['provides']>;
	scroll: ReturnType<ScrollPlugin['provides']>;
	annotation: ReturnType<AnnotationPlugin['provides']>;
}

export function DraftDetail() {
	const dispatch = useAppDispatch();
	const viewerRef = useRef<PDFViewerRef>(null);
	const { selected, entities } = useAppSelector(selectCommentsState);
	const comments = useMemo(() => selected.map((id) => entities[id]!).filter(Boolean), [selected, entities]);
	const ballot = useAppSelector(selectCommentsBallot);
	const [plugins, setPlugins] = useState<Plugins | null>(null);
	const [docState, setDocState] = useState<DocState>(docStateNull);
	const annotationsRef = useRef<PdfAnnotationObject[]>([]);

	const onViewerReady = useCallback(async () => {
		const registry = await viewerRef.current?.registry;
		const docManager = registry
			?.getPlugin<DocumentManagerPlugin>('document-manager')
			?.provides();
		docManager?.onDocumentOpened(async (doc) => {
			console.log(`Opened: ${doc.name} (${doc.id})`);
			setDocState(s => s.id === doc.id ? { ...s, name: doc.name || "Untitled" } : s);
		});
		docManager?.onDocumentClosed(async (documentId) => {
			console.log(`Closed: ${documentId}`);
			setDocState(s => s.id === documentId ? docStateNull : s);
		});
		docManager?.onDocumentError(async (doc) => {
			console.log(`Error: ${doc.documentId}`);
		});
		docManager?.onActiveDocumentChanged(async ({ currentDocumentId }) => {
			console.log(`Active: ${currentDocumentId}`);
			setDocState(s => s.id !== currentDocumentId ? { ...s, isReady: false } : s);
		});

		const scroll = registry
			?.getPlugin<ScrollPlugin>('scroll')
			?.provides();
		scroll?.onLayoutReady((event) => {
			console.log(`Layout ready ${event.documentId}`);
			setDocState(s => s.id === event.documentId ? { ...s, isReady: true } : s);
		});

		const annotation = registry
			?.getPlugin<AnnotationPlugin>('annotation')
			?.provides();

		if (docManager && scroll && annotation)
			setPlugins({ docManager, scroll, annotation });
	}, [setPlugins, setDocState]);

	useEffect(() => {
		if (!plugins) return;
		const { docManager } = plugins;

		if (docState.id && docState.ballot_id !== ballot?.id) {
			docManager.closeDocument(docState.id);
			return;
		}

		async function openDoc() {
			const file = await dispatch(openDraft(ballot!));
			console.log("open draft", file)
			if (file) {
				let doc;
				try {
					doc = await docManager.openDocumentBuffer({
						buffer: await file.arrayBuffer(),
						name: file.name,
						autoActivate: true
					}).toPromise();
				} catch (error) {
					console.error("Failed to open document buffer:", error);
					return;
				}
				setDocState({ id: doc.documentId, ballot_id: ballot!.id, name: file.name, isReady: false });
			}
		}

		if (docState.id === null)
			openDoc();
	}, [plugins, ballot]);

	useLayoutEffect(() => {
		async function updateAnnotations() {
			const { annotation, scroll } = plugins!;

			annotationsRef.current.forEach((a) => annotation.deleteAnnotation(a.pageIndex, a.id));
			annotationsRef.current = comments.map(c => commentAnnotation(c, ballot));
			annotationsRef.current.forEach(a => annotation.createAnnotation(a.pageIndex, a))
			const a = annotationsRef.current[0];
			if (a)
				scroll.scrollToPage({ pageNumber: a.pageIndex + 1, behavior: 'instant' });
		}
		if (docState.isReady) updateAnnotations();
	}, [ballot, comments, docState.isReady]);

	return (
		<PDFViewer
			ref={viewerRef}
			className="d-flex w-100 flex-grow-1 overflow-auto"
			onReady={onViewerReady}
			config={{
				theme: { preference: 'light' },
				disabledCategories: ['annotation', 'print', 'export', 'insert', 'form', 'redaction'],
			}}
		/>
	);
}