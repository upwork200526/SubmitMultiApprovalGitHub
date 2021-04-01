/********************************************************************************************************************************
@@Class Name: MultiUserApprovalController
@@Description: This is the controller class submitForApproval lwc. It is used to submit records for approval to multipe users
** Also process the submitted record to approve and reject based on the user input.
*******************************************************************************************************************************/
public without sharing class MultiUserApprovalController {
    /***********************************************************************************************************************
    **@Method Name: submitApprovalProcess
    **@Parameters: Id recordId, List<User> users, String comments, Boolean approverCheck
    **@Return Type: String
    **@Description: This method submits the record to list of approvers passed in the users parameter
    ************************************************************************************************************************/
    @AuraEnabled
    public static string submitApprovalProcess(Id recordId, List<Id> approverIds, String comments, Boolean approverCheck) {
        try{
            
            List<Approval.ProcessSubmitRequest> approvalRequestList = new List<Approval.ProcessSubmitRequest>();
            
            for (Id approverId : approverIds) {
                //Class to submit a record for approval.
                Approval.ProcessSubmitRequest approvalRequest = new Approval.ProcessSubmitRequest();
                //Sets the comments to be added to the approval request
                approvalRequest.setComments(comments);
                //Sets the ID of the record to be submitted for approval. 
                approvalRequest.setObjectId(recordId);
                
                approvalRequest.setNextApproverIds(new List<Id>{approverId});
                approvalRequestList.add(approvalRequest);
            }
            
            Approval.process(approvalRequestList);
            //Update records Approval Status to Submit for Approval and Require All Approvals checkbox based on user input
            SObject obj = recordId.getSObjectType().newSObject(recordId);
            obj.put('Require_All_Approvals__c', approverCheck);
            obj.put('Approval_Status__c', 'Submitted for Approval');
            update obj;
            
            return 'success';
        }
        catch(Exception e){
            String error = e.getMessage();
            //Parse the exception to show relevant error message
            if(error.contains(':') && error.countMatches(':') == 2){
                error = error.substringBetween(':', ':');
            }
            return error;
        }
    }
    
    /***********************************************************************************************************************
    **@Method Name: processApprovalRequests
    **@Parameters: List<Id> ids
    **@Return Type: void
    **@Description: This is the invocable method called from CustomProductCode Process Builder to process the record
    ** when approver approvers/rejects the record
    ************************************************************************************************************************/
    @InvocableMethod(label='Process Approval Requests')
    public static void processApprovalRequests(List<Id> ids) {
        //Considering manual approval/rejection process, processing the first record
        Id recordId = ids.get(0); 
        //Fetch Sobject Name
        String sObjName = recordId.getSObjectType().getDescribe().getName(); 
        
        String query = 'SELECT Id, Is_Active__c, Approval_Status__c, Require_All_Approvals__c, Individual_Approval_Status__c '+
            ' FROM '+String.escapeSingleQuotes(sObjName)+' WHERE Id=\''+String.escapeSingleQuotes(recordId)+'\'';
        
        List<sObject> sobjectList = Database.query(query);
        
        if(sobjectList != null && !sobjectList.isEmpty()){
            sObject record = sobjectList.get(0);
            String currentApprovalStatus = (String)record.get('Individual_Approval_Status__c');
            Boolean requireAllApprovals = (Boolean)record.get('Require_All_Approvals__c');
            //Process the pending approval requests in case of multiple approvers
            approveRejectRecords((Id)record.get('Id'), currentApprovalStatus, requireAllApprovals);
        }    
    }
    
    /***********************************************************************************************************************
    **@Method Name: approveRejectRecords
    **@Parameters: Id sObjectId, String currentApprovalStatus, Boolean requireAllApprovals
    **@Return Type: void
    **@Description: This method is used to process the pending approval requests in case of multiple approvers
    ** and process the submitted record
    ************************************************************************************************************************/
    public static void approveRejectRecords(Id sObjectId, String currentApprovalStatus, Boolean requireAllApprovals) {
       
        List<Approval.ProcessWorkitemRequest> approvalRequestList = new List<Approval.ProcessWorkitemRequest>();
    
        String action = currentApprovalStatus == 'Approved' ? 'Approve' : 'Reject';
        //Check if product code is to be marked active or inactive based on Approval Status
        Boolean isActive = currentApprovalStatus == 'Approved' ? true : false;
        SObject obj = sObjectId.getSObjectType().newSObject(sObjectId);
        
        List<ProcessInstanceWorkitem> processInstanceWorkitemList = getProcessInstanceWorkItems(sObjectId);
      
        //If no pending approvals are left then mark the Approval Status as current approval status coming from the request
        if(processInstanceWorkitemList == null || processInstanceWorkitemList.isEmpty()){
            obj.put('Approval_Status__c', currentApprovalStatus);
            obj.put('Is_Active__c', isActive);
            update obj;
        }
        /*If requireAllApprovals is false or Current Approval Status is reject, automatically update the status of all pending 
        request as current status coming from process*/
        else if((!requireAllApprovals && action == 'Approve') || (requireAllApprovals && action == 'Reject')){
            for (ProcessInstanceWorkitem workItem : processInstanceWorkitemList) {
                Approval.ProcessWorkItemRequest req = new Approval.ProcessWorkItemRequest();
                req.setWorkItemId(workItem.Id);
                req.setAction(action);
                req.setComments('Automatically '+currentApprovalStatus+'!!');
                approvalRequestList.add(req);
            }
            Approval.process(approvalRequestList);
            obj.put('Approval_Status__c', currentApprovalStatus);
            obj.put('Is_Active__c', isActive);
            update obj;
        }
    }
    
     /***********************************************************************************************************************
    **@Method Name: getProcessInstanceWorkItems
    **@Parameters: Id objectId
    **@Return Type: List<ProcessInstanceWorkitem>
    **@Description: Method to fetch pending approval request on the record
    ************************************************************************************************************************/
    private static List<ProcessInstanceWorkitem> getProcessInstanceWorkItems(Id objectId) {
        return [
            SELECT Id, ActorId, ProcessInstanceId, ProcessInstance.TargetObjectId
            FROM ProcessInstanceWorkitem
            WHERE ProcessInstance.TargetObjectId =: objectId 
        ];
    }
    
}