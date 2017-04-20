/*
	Copyright (C) 2017 Red Hat, Inc.

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	        http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

import { Component, Input, ViewChildren, Injectable, QueryList, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl, SafeStyle} from '@angular/platform-browser';

import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';
import { MappingModel, FieldMappingPair } from '../models/mapping.model';
import { TransitionModel, TransitionMode, TransitionDelimiter } from '../models/transition.model';
import { DocumentDefinition } from '../models/document.definition.model';

import { MappingManagementService } from '../services/mapping.management.service';
import { DocumentManagementService } from '../services/document.management.service';

import { MappingFieldDetailComponent } from './mapping.field.detail.component';
import { MappingFieldActionComponent } from './mapping.field.action.component';
import { ModalWindowComponent } from './modal.window.component';
import { TransitionSelectionComponent } from './transition.selection.component';

@Component({
	selector: 'detail-header',
	template: `
		<div class="MappingDetailHeader">
			<div class="card-pf-heading" (click)="handleMouseClick($event)">
				<h2 class="card-pf-title"><i [attr.class]="collapseToggleClass"></i>{{ title }}</h2>
		  	</div>
	  	</div>
    `
})

export class MappingDetailHeaderComponent { 
	@Input() title: string;
	public collapsed: boolean = false;
	public collapseToggleClass: string = "arrow fa fa-angle-down";

	public handleMouseClick(event: MouseEvent): void {
		this.collapsed = !this.collapsed;
		this.collapseToggleClass = "arrow fa fa-angle-" + (this.collapsed ? "right" : "down");
	}	
}

@Component({
	selector: 'mapping-field-section',
	template: `
		<div class="mappingFieldContainer">
			<div *ngFor="let fieldPair of getFieldPairs()" class="MappingFieldSection">				
   				<!-- non-collection field detail / action children -->
   				<div *ngIf="!isCollection">
					<div *ngFor="let field of getMappingFields(fieldPair, isSource)">
						<!-- header label / trash icon -->
						<div style="float:left;"><label>{{ getTopFieldTypeLabel() }}</label></div>
						<div style="float:right; margin-right:5px;">
			   				<i class="fa fa-trash" aria-hidden="true" (click)="removeField($event, field.path, fieldPair)"></i>
		   				</div>
		   				<div style="clear:both; height:0px;"></div>

			  			<mapping-field-detail [selectedFieldPath]="getTypedFieldPath(field)" 
			  				[originalSelectedFieldPath]="getTypedFieldPath(field)"
			  				[fieldPair]="fieldPair" [cfg]="cfg" [docDef]="cfg.getDoc(isSource)"></mapping-field-detail>
			  			<mapping-field-action [field]="field" [isSource]="isSource" [cfg]="cfg"></mapping-field-action>
			  		</div>
		  		</div>

		  		<!-- collection field pairing detail -->
		  		<div *ngIf="isCollection">
		  			<!-- header label / trash icon -->
					<div style="float:left;"><label>Source</label></div>
					<div style="float:right; margin-right:5px;">
		   				<i class="fa fa-trash" aria-hidden="true" (click)="removePair($event, fieldPair)"></i>
	   				</div>
	   				<div style="clear:both; height:0px;"></div>

		  			<mapping-field-detail *ngFor="let field of getMappingFields(fieldPair, true)" 
		  				[selectedFieldPath]="getTypedFieldPath(field)" 
		  				[originalSelectedFieldPath]="getTypedFieldPath(field)"
		  				[fieldPair]="fieldPair" [cfg]="cfg" [docDef]="cfg.getDoc(true)"></mapping-field-detail>		  			
		  			<div style="float:left;"><label>Target</label></div>
		  			<div style="clear:both; height:0px;"></div>
		  			<mapping-field-detail *ngFor="let field of getMappingFields(fieldPair, false)" 
		  				[selectedFieldPath]="getTypedFieldPath(field)" 
		  				[originalSelectedFieldPath]="getTypedFieldPath(field)"
		  				[fieldPair]="fieldPair" [cfg]="cfg" [docDef]="cfg.getDoc(false)"></mapping-field-detail>
		  		</div>
		  	</div>

		  	<!-- add button -->
	  		<div class="linkContainer" *ngIf="!isSource && mappingIsntEnum()">
				<a (click)="addClicked($event)" class="small-primary">{{ getAddButtonLabel() }}</a>
			</div>
	  	</div>
    `
})

export class MappingFieldSectionComponent { 
	@Input() cfg: ConfigModel;
	@Input() isSource: boolean = false;
	@Input() isCollection: boolean = false;

	public getFieldPairs(): FieldMappingPair[] {
		return this.cfg.mappings.activeMapping.fieldMappings;
	}

	public getTopFieldTypeLabel(): string {
		return (this.isCollection || this.isSource) ? "Source" : "Target";
	}

	public getAddButtonLabel(): string {
		if (this.isCollection) {
			return "Add Mapping";
		}
		return this.isSource ? "Add Source" : "Add Target"
	}

	private getTypedFieldPath(field: Field): string {
		var fieldPath: string = field.path;
		if (fieldPath != "[None]" && this.cfg.showMappingDataType) {
			fieldPath = fieldPath + " (" + field.type + ")";
		}
		return fieldPath;
	}

	public getMappingFields(fieldPair: FieldMappingPair, isSource: boolean): Field[] {
		var fields: Field[] = this.cfg.mappings.activeMapping.gettMappedFieldsFromPair(fieldPair, isSource, this.cfg);
		if (fields == null || fields.length == 0) {
			return [DocumentDefinition.getNoneField()];			
		}
		return fields;
	}

	private addClicked(event: MouseEvent): void {
		if (this.isCollection) {
			this.cfg.mappingService.addMappedPair();
		} else { //not collection
			var fieldPair: FieldMappingPair = this.cfg.mappings.activeMapping.getFirstFieldMapping();
			this.cfg.mappingService.addMappedField(null, fieldPair, this.isSource);
		
			//if adding a field and only one is now mapped, add another b/c user wants two fields now, not one
			var mappedFieldCount: number = this.cfg.mappings.activeMapping.getMappedFieldPaths(this.isSource).length;
			if (mappedFieldCount == 1) {
				this.cfg.mappingService.addMappedField(null, fieldPair, this.isSource);
			}
		}		
		this.cfg.mappingService.saveCurrentMapping();
	}	

	public mappingIsntEnum(): boolean {
		return !(this.cfg.mappings.activeMapping.transition.mode == TransitionMode.ENUM);
	}	

	public removePair(event: MouseEvent, fieldPair: FieldMappingPair): void {
		this.cfg.mappingService.removeMappedPair(fieldPair);		
		this.cfg.mappingService.saveCurrentMapping();
	}

	public removeField(event: MouseEvent, fieldPath: string, fieldPair: FieldMappingPair): void {
		this.cfg.mappingService.removeMappedField(fieldPath, fieldPair, this.isSource);		
		this.cfg.mappingService.saveCurrentMapping();
	}
}

@Component({
	selector: 'mapping-detail',
	template: `
	  	<div class='fieldMappingDetail'  [attr.style]="detailStyle" 
	  		*ngIf="cfg.mappings.activeMapping && cfg.showMappingDetailTray">	 
	  		<div class="card-pf"> 		
		  		<div class="card-pf-heading">
	  				<h2 class="card-pf-title">
			  			<div style="float:left;">Data Transformation</div>
			  			<div style="float:right; text-align:right;">
			  				<i class="fa fa-trash" aria-hidden="true" (click)="removeMapping($event)"></i> 
			  				<i class="fa fa-plus" aria-hidden="true" (click)="addNewMapping($event)"></i>
			  				<i aria-hidden="true" [attr.class]="'fa fa-cog ' + getDataTypeIconClass()" 
			  					(click)="toggleDataTypeVisibility($event)"></i>
			  				<i class="fa fa-close" aria-hidden="true" (click)="deselectMapping($event)"></i>
			  			</div>
			  			<div style="clear:both; height:0px;"></div>
		  			</h2>
		  		</div>
		  		<div class="fieldMappingDetail-body">
		  			<div *ngIf="!isMappingCollection()">
				  		<detail-header title="Sources" #sourcesHeader class="sources"></detail-header>	  		
					  	<mapping-field-section [cfg]="cfg" [isSource]="true" [isCollection]="false"
					  		*ngIf="!sourcesHeader.collapsed"></mapping-field-section>					
						<detail-header title="Action" #actionsHeader></detail-header>
				  		<transition-selector [cfg]="cfg" [modalWindow]="modalWindow" 
				  			*ngIf="!actionsHeader.collapsed"></transition-selector>			  		
				  		<detail-header title="Targets" #targetsHeader></detail-header>
				  		<mapping-field-section [cfg]="cfg" [isSource]="false" [isCollection]="false"
				  			*ngIf="!targetsHeader.collapsed"></mapping-field-section>  
			  		</div>
			  		<div *ngIf="isMappingCollection()">
			  			<detail-header title="Mappings" #mappingsHeader class="mappingsHeader"></detail-header>	  		
			  			<mapping-field-section [cfg]="cfg" [isSource]="false" [isCollection]="true"
				  			*ngIf="!mappingsHeader.collapsed"></mapping-field-section>  
			  		</div>
		  		</div>
		  	</div>
	    </div>
    `
})

export class MappingDetailComponent { 
	@Input() cfg: ConfigModel;
	@Input() modalWindow: ModalWindowComponent;

	@ViewChild('sourcesHeader')
  	public sourcesHeader: MappingDetailHeaderComponent;
  	@ViewChild('actionsHeader')
  	public actionsHeader: MappingDetailHeaderComponent;
  	@ViewChild('targetsHeader')
  	public targetsHeader: MappingDetailHeaderComponent;
  	@ViewChild('mappingsHeader')
  	public mappingsHeader: MappingDetailHeaderComponent;

	private detailStyle: SafeStyle;

	constructor(private sanitizer: DomSanitizer) {}

	public isMappingCollection(): boolean {
		return this.cfg.mappings.activeMapping.isCollectionMode(this.cfg);
	}

	private addNewMapping(event: MouseEvent): void {
		console.log("Creating new mapping.")
		this.cfg.mappingService.deselectMapping();
		this.cfg.mappings.activeMapping = new MappingModel();
		this.cfg.mappingService.notifyMappingUpdated();
	}

	private deselectMapping(event: MouseEvent): void {
		this.cfg.showMappingDetailTray = false;
		this.cfg.mappingService.deselectMapping();
	}

	private toggleDataTypeVisibility(event: MouseEvent) {
		this.cfg.showMappingDataType = !this.cfg.showMappingDataType;
	}

	private getDataTypeIconClass(): string {
		return this.cfg.showMappingDataType ? "selected" : "";
	}

	private removeMapping(event: MouseEvent): void {
		this.modalWindow.reset();
		this.modalWindow.confirmButtonText = "Remove";
		this.modalWindow.parentComponent = this;
		this.modalWindow.headerText = "Delete Mapping?";
		this.modalWindow.message = "Are you sure you want to remove the current mapping?";
		this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
			var self: MappingDetailComponent = mw.parentComponent as MappingDetailComponent;
			self.cfg.mappingService.removeMapping(self.cfg.mappings.activeMapping);
			this.cfg.showMappingDetailTray = false;
		};
		this.modalWindow.show();		
	}
}