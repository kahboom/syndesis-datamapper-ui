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

import { Component, Input, ViewChildren, Injectable, QueryList } from '@angular/core';
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
	selector: 'mapping-detail',
	template: `
	  	<div class='fieldMappingDetail'  [attr.style]="detailStyle" 
	  		*ngIf="cfg.mappings.activeMapping && cfg.showMappingDetailTray">
	  		<div class="card-pf-title" style="margin:0px;">
	  			<div style="float:left;"><h2 style="display:inline;">Data Transformation</h2></div>
	  			<div style="float:right; text-align:right; padding-right:2px;">
	  			<a (click)="removeMapping($event)" style="font-size:14px;" tooltip="Remove current mapping">
	  				<i class="fa fa-trash" aria-hidden="true" style="font-size:14px; margin-left:5px;"></i> 
	  			</a>
	  			<a (click)="addNewMapping($event)" tooltip="Add New Mapping" style="margin-left:5px;">
	  				<i style="font-size:14px;" class="fa fa-plus" aria-hidden="true"></i>
	  			</a>
	  			<a (click)="toggleDataTypeVisibility($event)" tooltip="Show field data types" style="margin-left:5px;">
	  				<i style="font-size:14px;" class="fa fa-cog" aria-hidden="true"></i>
	  			</a>
	  			<a (click)="deselectMapping($event)" tooltip="Deselect current mapping" style="margin-left:5px;">
	  				<i style="font-size:16px;" class="fa fa-close" aria-hidden="true"></i>
	  			</a>	  	
	  			</div>
	  			<div style="clear:both; height:0px;"></div>
	  		</div>
	  		<div class="mappingFieldContainer">
		  		<h3 style="font-size:12px; font-weight:bold;">Source</h3>
		  		<div *ngFor="let field of getMappingFields(true)" style="padding-bottom:10px;">
		  			<mapping-field-detail #mappingField [selectedFieldPath]="field.path" 
		  				[originalSelectedFieldPath]="field.path"
		  				[cfg]="cfg" [docDef]="cfg.inputDoc"></mapping-field-detail>
		  			<mapping-field-action [field]="field" [mapping]="cfg.mappings.activeMapping" 
		  				[isInput]="true" [cfg]="cfg"></mapping-field-action>
		  		</div>
				<!-- <a (click)="addField($event, true)"><i class="fa fa-plus" 
					aria-hidden="true" style="font-size:10px"></i> Add Field</a> -->
			</div>
	  		<div class="mappingFieldContainer" >
	  			<h3 class="sectionHeader" style="float:left; margin-bottom:10px;">Action:&nbsp;</h3>
	  			<transition-selector style="float:left; clear:left; width:100%;" [cfg]="cfg"></transition-selector>
	  			<div style="clear:both; height:0px;"></div>
	  		</div>
	  		<div class="mappingFieldContainer">
		  		<h3 style="font-size:12px; font-weight:bold;">Target</h3>
		  		<div *ngFor="let field of getMappingFields(false)" style="padding-bottom:10px;">
		  			<mapping-field-detail #mappingField [selectedFieldPath]="field.path" 
		  				[originalSelectedFieldPath]="field.path"
		  				[cfg]="cfg" [docDef]="cfg.outputDoc"></mapping-field-detail>
		  			<mapping-field-action [field]="field" [mapping]="cfg.mappings.activeMapping" 
		  				[isInput]="false" [cfg]="cfg"></mapping-field-action>
		  		</div>
				<a (click)="addField($event, false)"><i class="fa fa-plus" 
					aria-hidden="true" style="font-size:10px"></i> Add Field</a>	  		
			</div>		  				  		
	    </div>
    `
})

export class MappingDetailComponent { 
	@Input() cfg: ConfigModel;
	@Input() modalWindow: ModalWindowComponent;

	private detailStyle: SafeStyle;

	@ViewChildren('mappingField') mappingFields: QueryList<MappingFieldDetailComponent>;

	constructor(private sanitizer: DomSanitizer) {}

	private getMappingFields(isInput: boolean): Field[] {
		var docDef: DocumentDefinition = isInput ? this.cfg.inputDoc : this.cfg.outputDoc;
		var fieldPaths: string[] = isInput ? this.cfg.mappings.activeMapping.inputFieldPaths
			: this.cfg.mappings.activeMapping.outputFieldPaths;
		if (fieldPaths == null || fieldPaths.length == 0) {
			return [docDef.getNoneField()];			
		}
		return docDef.getFields(fieldPaths);
	}

	private addNewMapping(event: MouseEvent): void {
		console.log("Creating new mapping.")
		this.cfg.mappingService.deselectMapping();
		this.cfg.mappings.activeMapping = this.cfg.mappingService.createMapping();
		this.cfg.mappingService.notifyActiveMappingUpdated(true);
	}

	private deselectMapping(event: MouseEvent): void {
		this.cfg.showMappingDetailTray = false;
		this.cfg.mappingService.deselectMapping();
	}

	private toggleDataTypeVisibility(event: MouseEvent) {
		this.cfg.showMappingDataType = !this.cfg.showMappingDataType;
	}

	private removeMapping(event: MouseEvent): void {
		this.modalWindow.reset();
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

	private addField(event: MouseEvent, isInput: boolean): void {
		this.cfg.mappingService.addMappedField(null, isInput);
		//if adding a field and only one is now mapped, add another b/c user wants two fields now, not one
		var mapping: MappingModel = this.cfg.mappings.activeMapping;
		var mappedFieldCount: number = isInput ? mapping.inputFieldPaths.length : mapping.outputFieldPaths.length;
		if (mappedFieldCount == 1) {
			this.cfg.mappingService.addMappedField(null, isInput);
		}
		this.cfg.mappingService.saveCurrentMapping();
	}	

	public updateHeight(): void {
		/*
		if (this.cfg.inputDoc && this.cfg.outputDoc) {
			var maxFieldCount: number = Math.max(this.cfg.inputDoc.fields.length, 
				this.cfg.outputDoc.fields.length);
			var heightCSS: string = ((maxFieldCount * 40) + 120).toString() + "px";
			this.detailStyle = this.sanitizer.bypassSecurityTrustStyle("height:" + heightCSS + ";");
		}
		*/		
	}
}