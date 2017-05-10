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
import { MappingModel } from '../models/mapping.model';
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
			<div *ngFor="let field of getMappingFields()" class="MappingFieldSection">
				<div style="float:left;">
					<label>{{ isSource ? "Source" : "Target" }}</label>
				</div>
				<div style="float:right; margin-right:5px;">
	   				<i class="fa fa-trash" aria-hidden="true" (click)="remove($event, field.path)"></i>
   				</div>
   				<div style="clear:both; height:0px;"></div>
	  			<mapping-field-detail #mappingField [selectedFieldPath]="getTypedFieldPath(field)" 
	  				[originalSelectedFieldPath]="getTypedFieldPath(field)"
	  				[cfg]="cfg" [docDef]="cfg.getDoc(isSource)"></mapping-field-detail>
	  			<mapping-field-action [field]="field" [isSource]="isSource" [cfg]="cfg"></mapping-field-action>
	  		</div>
	  		<div class="linkContainer" *ngIf="!isSource && mappingIsntEnum()">
				<a (click)="addField($event)"  
					class="small-primary">
					{{ isSource ? "Add Source" : "Add Target" }}
				</a>
			</div>
	  	</div>
    `
})

export class MappingFieldSectionComponent { 
	@Input() cfg: ConfigModel;
	@Input() isSource: boolean = false;

	private getTypedFieldPath(field: Field): string {
		var fieldPath: string = field.path;
		if (fieldPath != "[None]" && this.cfg.showMappingDataType) {
			fieldPath = fieldPath + " (" + field.type + ")";
		}
		return fieldPath;
	}

	public getMappingFields(): Field[] {
		var docDef: DocumentDefinition = this.cfg.getDoc(this.isSource);
		var fieldPaths: string[] = this.isSource ? this.cfg.mappings.activeMapping.inputFieldPaths
			: this.cfg.mappings.activeMapping.outputFieldPaths;
		if (fieldPaths == null || fieldPaths.length == 0) {
			return [docDef.getNoneField()];			
		}
		return docDef.getFields(fieldPaths);
	}

	private addField(event: MouseEvent): void {
		this.cfg.mappingService.addMappedField(null, this.isSource);
		//if adding a field and only one is now mapped, add another b/c user wants two fields now, not one
		var mapping: MappingModel = this.cfg.mappings.activeMapping;
		var mappedFieldCount: number = this.isSource ? mapping.inputFieldPaths.length : mapping.outputFieldPaths.length;
		if (mappedFieldCount == 1) {
			this.cfg.mappingService.addMappedField(null, this.isSource);
		}
		this.cfg.mappingService.saveCurrentMapping();
	}	

	public mappingIsntEnum(): boolean {
		return !(this.cfg.mappings.activeMapping.transition.mode == TransitionMode.ENUM);
	}	

	remove(event: MouseEvent, fieldPath: string): void {
		this.cfg.mappingService.removeMappedField(fieldPath, this.isSource);
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
			  		<detail-header title="Sources" #sourcesHeader class="sources"></detail-header>	  		
				  	<mapping-field-section [cfg]="cfg" [isSource]="true" 
				  		*ngIf="!sourcesHeader.collapsed"></mapping-field-section>					
					<detail-header title="Action" #actionsHeader></detail-header>
			  		<transition-selector [cfg]="cfg" [modalWindow]="modalWindow" 
			  			*ngIf="!actionsHeader.collapsed"></transition-selector>			  		
			  		<detail-header title="Targets" #targetsHeader></detail-header>
			  		<mapping-field-section [cfg]="cfg" [isSource]="false" 
			  			*ngIf="!targetsHeader.collapsed"></mapping-field-section>  
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

	private detailStyle: SafeStyle;

	constructor(private sanitizer: DomSanitizer) {}

	private addNewMapping(event: MouseEvent): void {
		console.log("Creating new mapping.")
		this.cfg.mappingService.deselectMapping();
		this.cfg.mappings.activeMapping = new MappingModel();
		this.cfg.mappingService.notifyActiveMappingUpdated(true);
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