/********************************************************************************************************************************
@@Class Name: LookupController
@@Description: This is the wrapper class to store the Code Wrapper in the Tree Grid format use by CodeSelectorController Class
*******************************************************************************************************************************/
public with sharing class LookupController {

    /***********************************************************************************************************************
    **@Method Name: searchRecords
    **@Parameters: String objectApiName, List<Id> selectedRecordIds, String searchFields, String searchText, Integer recordLimit
    **@Return Type: List<sObject>
    **@Description: This method returns the list of sobject for matching records on the basis of search text provided to lwc/aura
    ************************************************************************************************************************/
    @AuraEnabled(Cacheable=false)
    public static List<sObject> searchRecords(String objectApiName, List<Id> selectedRecordIds, String searchFields, String searchText, Integer recordLimit){
        try {
            String query = 'SELECT '+searchFields+
            ' FROM '+objectApiName+
            ' WHERE Name LIKE \'%'+
            searchText+'%\''+
            ' AND Id NOT IN :selectedRecordIds'+
            ' ORDER BY NAME '+
            ' LIMIT '+recordLimit;
          
            List<sObject> sobjectList = Database.query(query);
            return sobjectList;
        } catch (Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }
}