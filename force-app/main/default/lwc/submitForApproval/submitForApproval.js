import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import submitApprovalProcess from '@salesforce/apex/MultiUserApprovalController.submitApprovalProcess';

//Headers for Approvers Table
const columns = [
    { label: 'Approver Name', fieldName: 'Name' },
    {
        label: 'Actions',
        type: 'button',
        typeAttributes:
        {
            iconName: 'utility:delete',
            label: 'Delete',
            name: 'delete',
            title: 'deleteTitle',
            disabled: false,
            value: 'Id'
        }
    }
];
//String query to search fields in User Search Lookup
const searchFields = "Id, Name";

export default class SubmitForApproval extends LightningElement {

    searchFields = searchFields;
    columns = columns;

    @track selectedRecordIds = [];
    @track data = [];
    
    @api recordId; //Salesforce Id of the record for which approval is to be submitted

    //Method called when user selectes any approver from search lookup
    handleApproverSearch(event) {
        let approver = event.detail;
        this.data = [...this.data, approver];
        this.selectedRecordIds.push(approver.Id);
    }

    //Method to handle delete approver event when user clicks on remove button on row of approver table
    handleRowAction(event) {
        const action = event.detail.action;
        const row = event.detail.row;
        switch (action.name) {
            case 'delete':
                let rows = this.data;
                rows.forEach(approver => {
                    if (approver.Id === row.Id) {
                        rows.splice(rows.indexOf(approver), 1);
                    }
                });
                this.data = [...rows];
                this.selectedRecordIds = this.selectedRecordIds.filter(recordId => recordId !== row.Id);
                break;
        }
    }

    //Method to submit record for approval
    handleSubmit() {
        let approverComment = this.template.querySelector('.approverComment');
        let approverCheck = this.template.querySelector('.approverCheck');
        let selectedRecords = this.template.querySelector('.selectedApprovers').getSelectedRows();
        
        approverComment.setCustomValidity("");

        //Validate approver comments should be present
        if(!approverComment.value){
            this.showToast('Please enter approver comments!!', 'error');
            approverComment.reportValidity();
        }
        //Validate approvers should be selected
        else if(!(selectedRecords.length > 0)){
            this.showToast('No approvers selected!!', 'error');
        }
        else {
            let approvers = [];
            selectedRecords.forEach(record => {
                approvers.push(record.Id);
            });
            //Imperative call
            submitApprovalProcess({ recordId: this.recordId, approverIds : approvers, comments : approverComment.value, approverCheck: approverCheck.checked})
                .then((result) => {
                    if(result === 'success'){
                        this.showToast('Submitted successfully!!', 'success');
                        this.closeQuickAction();
                    }
                    else {
                        this.showToast(result, 'error');
                    }
                })
                .catch(error => {
                    this.showToast(JSON.stringify(error), 'error');
                });
        }
    }

    //Method to display toast message
    showToast(message, variant) {
        const event = new ShowToastEvent({
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    //Method to dispatch event to close the quick action
    closeQuickAction() {
        const closeQA = new CustomEvent('close');
        // Dispatches the event.
        this.dispatchEvent(closeQA);
    }
}