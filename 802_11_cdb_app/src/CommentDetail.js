/*
 * Comment detail
 */
import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import './CommentDetail.css'

 export class CommentDetail extends React.Component {
 	constructor(props) {
 		super(props)
 		this.state = {
 			CIDs: 0,
	        Commenter: '',
	        MustSatisfy: false,
	        Category: '',
	        Clause: '',
	        Page: '',
	        Comment: '',
	        ProposedChange: '',
	        Assignee: '',
	        ResolutionStatus: '',
	        Resolution: '',
	        EditStatus: '',
	        EditNotes: '',
 		}
 	}

 	render() {
 		const modalStyle = {
			overlay: {
        		backgroundColor: 'rgba(0,0,0,0.4)' /* Black w/ opacity */
	      	},
	    	content: {
		        border: '1px solid #888',
		        top: '15%',
		        bottom: '15%',
		        width: '80%',
		        margin: 'auto'
	      	}
	    }

    	return(
	        <div id='CommentDetail'>
	          <div className='row'>
	            <div className='CID'><label>CID:</label><span>{this.state.CID}</span></div>
	            <div className='Commenter'><label>Commenter:</label><span>{this.state.Commenter}</span></div>
	            <div className='MustSatisfy'><label>Must Satisfy:</label><input type='checkbox' checked={this.state.MustSatisfy} /></div>
	          </div>

	          <div className='row'>
	            <div className='Page'><label>Page/Line:</label><span>{this.state.page}</span></div>
	            <div className='Clause'><label>Clause:</label><span>{this.state.clause}</span></div>
	            <div className='Category'><label>Category:</label><span>{this.state.category}</span></div>
	          </div>

	          <div className='row'>
	            <div className='Comment'><label>Comment:</label><br /><div>{this.state.Comment}</div></div>
	          </div>

	          <div className='row'>
	            <div className='ProposedChange'><label>Proposed Change:</label><br /><div>{this.state.ProposedChange}</div></div>
	          </div>
	          <div className='row'>
	            <div className='Assignee'><label>Assignee:</label><span>{this.state.assginee}</span></div>
	            <div className='Submission'><label>Submission:</label><span>{this.state.submission}</span></div>
	          </div>
	          <button onClick={this.updateComment}>Submit</button>
	          <button onClick={e => {this.setState({showEditModal: false})}}>Cancel</button>
	        </div>
		)
 	}
 }