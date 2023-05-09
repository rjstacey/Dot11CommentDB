import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';

import {Form, Row, AppModal} from 'dot11-components';

import { useAppDispatch } from '../store/hooks';
import { votersFromSpreadsheet } from '../store/voters';

const VotersImportForm = styled(Form)`
	width: 400px;
`;

function VotersImportModal({
	isOpen,
	close,
	votingPoolName,
}: {
	isOpen: boolean;
	close: () => void;
	votingPoolName: string;
}) {
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [errMsg, setErrMsg] = React.useState('');

	const dispatch = useAppDispatch();
	
	async function submit() {
		const file = fileInputRef.current?.files![0];
		if (!file) {
			setErrMsg('Select file');
			return;
		}
		await dispatch(votersFromSpreadsheet(votingPoolName, file));
		close();
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<VotersImportForm
				title={`Import voters list for ${votingPoolName}`}
				errorText={errMsg}
				submit={submit}
				cancel={close}
			>
				<Row>
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileInputRef}
					/>
				</Row>
			</VotersImportForm>
		</AppModal>
	)
}

export default VotersImportModal;
