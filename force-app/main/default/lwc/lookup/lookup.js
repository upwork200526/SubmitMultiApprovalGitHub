import { LightningElement, api } from 'lwc';
import searchRecords from '@salesforce/apex/LookupController.searchRecords';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class Lookup extends LightningElement {
    @api placeHolder; //Placeholder in search field
    @api objectApiName; //Name of the object to be queried
    @api limit; //Set limit on number of matching records to be queried
    @api searchFields; //Add List of comma separated search fields in string format
    @api selectedRecordIds; //Set record ids that are not to be considered in Search

    searchText = ''; //Matching name text to be searched in records
    recordFound = false; //Set true if records are found in search
    showSearchList = false; //Set true if user has entered something in search field
    searchList = []; //List of records retured in search

    /**************Method to perform search on change of search field***************/
    searchRecords(event) {

        this.searchText = event.target.value;
        //If search text is blank hide list to show records
        if (this.searchText === '') {
            this.closeSearchList();
        }
        else {
            //Call apex method searchRecords to fetch the matching records
            searchRecords({ objectApiName: this.objectApiName, selectedRecordIds: this.selectedRecordIds, searchFields: this.searchFields, searchText: this.searchText, recordLimit: this.limit })
                .then(result => {
                    if (result.length > 0) {
                        this.searchList = result;
                        this.recordFound = true;
                    }
                    else {
                        this.searchList = [];
                        this.recordFound = false;
                    }
                    this.showSearchList = true;
                        if (this.searchText === '') {
                            this.closeSearchList();
                        }
                })
                .catch(error => {
                    this.closeSearchList();
                    this.error = JSON.stringify(error);
                    this.showToast(this.error, 'error');
                });
        }
    }

    /*************Method to reset parameters and close List displaying records**********/
    closeSearchList() {
        this.searchList = [];
        this.showSearchList = false;
        this.searchText = '';
        this.recordFound = false;
    }

    /***********Method to display toast message************/
    showToast(message, variant) {
        const event = new ShowToastEvent({
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    /******Fire search event to send record to parent if user selects any record from the display list of searched records*********/
    sendSearchRecords(event) {
        let selectedRecordId = event.currentTarget.dataset.value;
        let selectedRecord = this.getSeletedRecord(selectedRecordId);
        // Dispatches the event.
        this.dispatchEvent(new CustomEvent('search', { detail: selectedRecord }));
        this.closeSearchList();
    }

    /***********Helper method of sendSearchRecords to return record from matching id*********/
    getSeletedRecord(recordId) {
        let selectedRecord = null;
        this.searchList.forEach((record) => {
            if (record.Id === recordId) {
                selectedRecord = record;
            }
        });
        return selectedRecord;
    }
}