import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import submitApprovalProcess from '@salesforce/apex/MultiUserApprovalController.submitApprovalProcess';
import OWNER from '@salesforce/schema/Custom_Product_Code__c.CreatedBy.Name'
import PROFILENAME from '@salesforce/schema/Custom_Product_Code__c.CreatedBy.Profile.Name'
import EMAIL from '@salesforce/schema/Custom_Product_Code__c.CreatedBy.Email'
import { getRecord } from 'lightning/uiRecordApi';

//Headers for Approvers Table
const columns = [
    { label: 'Approver Name', fieldName: 'Name' },
    { label: 'Email', fieldName: 'Email' },
    { label: 'Profile Name', fieldName: 'profileName' },
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
const searchFields = "Id, Name, Email, Profile.Name";

export default class SubmitForApproval extends LightningElement {

    searchFields = searchFields;
    columns = columns;
    @api recordId; //Salesforce Id of the record for which approval is to be submitted
    @track selectedRecordIds = [];
    @track data = [];

    @track var1 =[];
    @wire (getRecord,{recordId:'$recordId',fields:[OWNER,PROFILENAME,EMAIL]})
    getRecordCallBack({data,error}) {
        if(data){
            let approver1 = {
                Id: data.fields.CreatedBy.value.Id,
                Name: data.fields.CreatedBy.value.fields.Name.value,
                Email: data.fields.CreatedBy.value.fields.Email.value,
                profileName: data.fields.CreatedBy.value.fields.Profile.displayValue
            }
            this.data = [...this.data, approver1];
            this.var1 = [...this.var1, approver1];
            console.log(data);
            console.log("data block");
        }
        if(error){
            console.log(error);
        }
    }
  
    
    //Method called when user selectes any approver from search lookup
    handleApproverSearch(event) {
        let approver = event.detail;
        approver.profileName = approver.Profile?approver.Profile.Name:'';
        this.data = [...this.data, approver];
        console.log(approver);
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