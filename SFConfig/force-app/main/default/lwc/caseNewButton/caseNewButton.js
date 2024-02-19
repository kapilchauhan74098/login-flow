/*
* @component       :   CaseNewButton
* @Author          :   Prahlad Bhadani <prbhadani@deloitte.com>
* @Created         :   06/09/2023
* @Description     :   LWC to override standard new button on Case object.
*/
import { LightningElement, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import strUserId from '@salesforce/user/Id';
import fetchAccountAddress from '@salesforce/apex/KIService_CaseNewButtonController.fetchAccountAddress';
//objects
import LEAD_OBJECT from '@salesforce/schema/Lead';
import CASE_OBJECT from '@salesforce/schema/Case';
import MAINTENANCE_PLAN_OBJECT from '@salesforce/schema/MaintenancePlan';
//fields
import ACCOUNTID_FIELD from '@salesforce/schema/MaintenancePlan.AccountId';
import ACCOUNT_ADDRESS_FIELD from '@salesforce/schema/MaintenancePlan.Account_Address__c';
import KPMC_TYPE_FIELD from '@salesforce/schema/MaintenancePlan.Type__c';
import PROFILE_NAME_FIELD from '@salesforce/schema/User.Profile.Name';
import LEAD_SOURCE_FIELD from '@salesforce/schema/Lead.LeadSource';
import SALES_UNIT_FIELD from '@salesforce/schema/Lead.KI_Sales_Unit__c';
import CURRENCY_FIELD from '@salesforce/schema/Lead.CurrencyIsoCode';
//custom labels
import KohlerIndiaServiceDesk from '@salesforce/label/c.Kohler_India_Service_Desk';
import GeneralEnquiry from '@salesforce/label/c.General_Enquiry';
import SalesEnquiry from '@salesforce/label/c.Sales_Enquiry';
import KPMCRequest from '@salesforce/label/c.KIService_KPMC_Request';
import ServiceRequest from '@salesforce/label/c.Service_Request';
import KIAssociateLead from '@salesforce/label/c.KI_Associate_Lead';
import SelectAnOption from '@salesforce/label/c.SelectAnOption'
import EscalationRequest from '@salesforce/label/c.EscalationRequest'
import NewGeneralEnquiry from '@salesforce/label/c.KIService_NewGeneralEnquiry';
import NewKPMCRequest from '@salesforce/label/c.KIService_New_KPMC_Request';
import ContactCenter from '@salesforce/label/c.KIService_ContactCenter';
import Service from '@salesforce/label/c.Case_Call_Type';
import INR from '@salesforce/label/c.KIService_INR';
//profiles who should be redirected to the choice screen
const validProfiles = [KohlerIndiaServiceDesk];
const CONTACT_CENTER = ContactCenter;
const SALES_UNIT_SERVICE = Service;
const CURRENCY_INR = INR;
//added by kapil
import WarrantyRegistration from '@salesforce/label/c.WarrantyRegistration';

export default class CaseNewButton extends NavigationMixin(LightningElement) {
    @api caseRecordTypeId; //public property to receive case record type id from URL
    @api sourceAccountId;
    //@api userId;
    kiAssociateLeadRT = '';
    servRequestCaseRT = '';
    isValidProfile = false;
    radioValue = '';
    showServiceRequestFlow = false;
    showEscalationRequestFlow = false;
    showGeneralEnquiryFlow = false;
    showKPMCFlow = false; //sonal
    showChoicePage = false;
    flowCardHeaderValue = '';
    newRecId = '';
    escalationReqCaseIdOutputVar = 'var_finalCaseId';
    servReqCaseIdOutputVar = 'var_caseId';
    genEnqIdOutputVar = 'generalEnquiryId';
    kpmcOutputVar = 'kpmcId'; //sonal
    WarrantyRegistrationOutputVar = 'newlyCreatedWarrantyId';//added by kapil
    showCancelButton = false;
    @api accountAddressId; //sonal
    accountRecordType;
    @api kpmcType; //sonal
    showWarrantyRegistrationFlow = false;//addedByKapil
    label = {
        GeneralEnquiry,
        SalesEnquiry,
        KPMCRequest,
        ServiceRequest,
        KIAssociateLead,
        SelectAnOption,
        EscalationRequest,
        NewGeneralEnquiry,
        NewKPMCRequest,
        WarrantyRegistration
    }
    flowApiNames = {
        warrantyRegistrationFlow : 'WarrantyRegistrationFlow' // added by kapil
    }

    get showFlowCard(){
        return this.showEscalationRequestFlow || this.showServiceRequestFlow || this.showGeneralEnquiryFlow || this.showKPMCFlow  || this.showWarrantyRegistrationFlow; //sonal
    }
    get caseOptions(){
        return [
            { label: this.label.ServiceRequest, value: this.label.ServiceRequest },
            { label: this.label.GeneralEnquiry, value: this.label.GeneralEnquiry },
            { label: this.label.SalesEnquiry, value: this.label.SalesEnquiry },
            { label: this.label.KPMCRequest, value: this.label.KPMCRequest },
            { label: this.label.WarrantyRegistration, value : this.label.WarrantyRegistration}//added by kapil
            // { label: this.label.EscalationRequest, value: this.label.EscalationRequest }
        ];
    }

    get nextDisabled(){
        return this.radioValue ? false : true;
    }

    get flowCardHeader(){
        return this.flowCardHeaderValue;
    }
    get warrantyRegistrationInputVariables() {
        return [
            {
                name: 'recordId',
                type: 'String',
                value: this.sourceAccountId
            }
        ];
    }


    @wire(getObjectInfo, { objectApiName: LEAD_OBJECT })
    wiredLeadObjectInfo({data, error}){ //fetch Ki associate lead record type
        if(data){
            const rtis = data.recordTypeInfos;
            this.kiAssociateLeadRT = Object.keys(rtis).find((rti) => rtis[rti].name === this.label.KIAssociateLead);
        }else if(error){
            console.error(JSON.stringify(error));
        }
    }
    @wire(getObjectInfo, { objectApiName: CASE_OBJECT }) //fetch Service Request record type
    wiredCaseObjectInfo({data, error}){
        if(data){
            const rtis = data.recordTypeInfos;
            this.servRequestCaseRT = Object.keys(rtis).find((rti) => rtis[rti].name === this.label.ServiceRequest);
        }else if(error){
            console.error(JSON.stringify(error));
        }
    }
    @wire(getRecord, { recordId: strUserId, fields: [PROFILE_NAME_FIELD]})
    wireuser({ error, data }) {
        if (data) {
            console.log('sourceAccountId-->'+this.sourceAccountId);
            if (validProfiles.includes(getFieldValue(data, PROFILE_NAME_FIELD))) { //valid profile
                this.isValidProfile = true;
                this.showChoicePage = true;
            }else{ 
                this[NavigationMixin.Navigate]({
                    type: 'standard__objectPage',
                    attributes: {
                        objectApiName: CASE_OBJECT.objectApiName,
                        actionName: 'new'
                    },
                    state: {
                        count: '1',
                        nooverride: '1',
                        navigationLocation: 'LIST_VIEW',
                        backgroundContext: '/lightning/o/Case/list?filterName=Recent',
                        recordTypeId: this.caseRecordTypeId
                    }
                });
            }
        }else if(error){
            console.error(JSON.stringify(error));
        }
    }

    radioChangeHandler(event){
        this.radioValue = event.target.value;
        console.log('this.radioValue **' , this.radioValue);
    }

    backHandler(){
        this.showEscalationRequestFlow = false;
        this.showServiceRequestFlow = false;
        this.showGeneralEnquiryFlow = false;
        this.showKPMCFlow = false; //sonal
        this.showWarrantyRegistrationFlow = false;//added by kapil
        this.flowCardHeaderValue = '';
        this.radioValue = '';
        this.showChoicePage = true;
    }

    escReqStatusChangeHandler(event){
        if(event.detail.status === 'STARTED'){
            this.flowCardHeaderValue = event.detail.flowTitle;
        }
        if (event.detail.status === 'FINISHED' || event.detail.status === 'FINISHED_SCREEN') {
            const receivedVars = event.detail.outputVariables;
            const varCaseIdObj = receivedVars.find(item => item.name === this.escalationReqCaseIdOutputVar);
            if(varCaseIdObj){
                this.newRecId = varCaseIdObj.value;
                this.navigateToRecord(this.newRecId);
                this.backHandler();
            }
        }
    }
    //added by kapil
    warrantyRegistrationStatusChangeHandler(event){
        if(event.detail.status === 'STARTED'){
            this.flowCardHeaderValue = this.label.WarrantyRegistration;
        }
        if (event.detail.status === 'FINISHED') {
            const receivedVars = event.detail.outputVariables;
            const varCaseIdObj = receivedVars.find(item => item.name === this.WarrantyRegistrationOutputVar);
            if(varCaseIdObj){
                this.newRecId = varCaseIdObj.value;
                console.log('newRecId--->'+this.newRecId);
                this.navigateToRecord(this.newRecId);
                this.backHandler();
            }
        }
    }

    srSuccessHandler(event){
        this.navigateToRecord(event.detail.navId);
        this.backHandler();
    }
    
    navigateToRecord(recId){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recId,
                actionName: 'view'
            }
        });
    }
    connectedCallback(){
    }
    nextHandler(){
        console.log('this.radioValue **' , this.radioValue);
        this.showChoicePage = false;
        this.showCancelButton = false;
        if(this.radioValue === this.label.ServiceRequest){
            this.showServiceRequestFlow = true;
        }else if(this.radioValue === this.label.GeneralEnquiry){
            this.showGeneralEnquiryFlow = true;
            this.showCancelButton = true;
        }else if(this.radioValue === this.label.SalesEnquiry){
            if(this.kiAssociateLeadRT){
                this[NavigationMixin.Navigate]({
                    type: 'standard__objectPage',
                    attributes: {
                        objectApiName: LEAD_OBJECT.objectApiName,
                        actionName: 'new'
                    },
                    state: {
                        nooverride: '1',
                        recordTypeId: this.kiAssociateLeadRT,
                        defaultFieldValues: `${LEAD_SOURCE_FIELD.fieldApiName}=${CONTACT_CENTER},${SALES_UNIT_FIELD.fieldApiName}=${SALES_UNIT_SERVICE},${CURRENCY_FIELD.fieldApiName}=${CURRENCY_INR}`
                    }
                });
            }else{
                console.error('Could not access '+ this.label.KIAssociateLead + ' Record Type!');
            }
        }else if(this.radioValue === this.label.EscalationRequest){
            this.showEscalationRequestFlow = true;
        }else if(this.radioValue === this.label.KPMCRequest){
            this.showKPMCFlow = true;
            this.showCancelButton = true;
        }else if (this.radioValue === this.label.WarrantyRegistration){
            this.showWarrantyRegistrationFlow = true;
            this.showCancelButton = true;
        }
    }
}