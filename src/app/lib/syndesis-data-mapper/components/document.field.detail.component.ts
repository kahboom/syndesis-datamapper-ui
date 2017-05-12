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

import { Component, Input, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl, SafeStyle} from '@angular/platform-browser';

import { ConfigModel } from '../models/config.model';
import { Field, PropertyField } from '../models/field.model';   
import { DocumentDefinition } from '../models/document.definition.model';
import { MappingModel, FieldMappingPair } from '../models/mapping.model';

import { DocumentManagementService } from '../services/document.management.service';

import { LineMachineComponent } from './line.machine.component';
import { ModalWindowComponent } from './modal.window.component';
import { PropertyFieldEditComponent } from './property.field.edit.component';

@Component({
	selector: 'document-field-detail',
	template: `
		<div class="DocumentFieldDetailComponent" #fieldDetailElement on-mouseover='handleMouseOver($event)'>
			<div [attr.class]='getCssClass()' (click)="handleMouseClick($event)" *ngIf="field.visible">							
				<div style="float:left;">														
					<div style="display:inline-block; width:24px;" *ngIf="!field.isSource()">
						<i [attr.class]='getMappingClass()'></i>
						<i [attr.class]='getTransformationClass()'></i>
					</div>
					<div class="spacer" [attr.style]="getSpacerWidth()">&nbsp;</div>
					<div *ngIf="!field.isTerminal()" style="display:inline-block;">					
						<i [attr.class]="getParentToggleClass()"></i>
						<i *ngIf="!field.isCollection" class="fa fa-folder parentFolder"></i>
						<i *ngIf="field.isCollection" class="fa fa-list-ul parentFolder"></i>
					</div>
					<div *ngIf="field.isTerminal()" style="display:inline-block;">					
						<i class="fa fa-file-o"></i>
					</div>
		  			<label>{{field.displayName}}</label>
		  		</div>		  		
		  		<div style="float:right; width:24px; text-align:right;" *ngIf="field.isSource()">
		  			<i [attr.class]='getTransformationClass()'></i>
		  			<i [attr.class]='getMappingClass()'></i>
		  		</div>
		  		<div class="propertyFieldIcons" style="float:right; text-align:right" *ngIf="fieldIsPropertyField()">
		  			<i class="fa fa-edit link" aria-hidden="true" (click)="editField()"></i>
				   	<i class="fa fa-trash link" aria-hidden="true" (click)="removeField()"></i>
		  		</div>
		  		<div class="clear"></div>
		  	</div>
		  	<div class="childrenFields" *ngIf="!field.isTerminal() && !field.collapsed">
		  		<document-field-detail #fieldDetail *ngFor="let f of field.children" 
					[field]="f" [lineMachine]="lineMachine" 
					[cfg]="cfg"></document-field-detail>
			</div>
		</div>	  	
    `
})

export class DocumentFieldDetailComponent { 
	@Input() cfg: ConfigModel;
	@Input() field: Field;	
	@Input() lineMachine: LineMachineComponent;
	@Input() modalWindow: ModalWindowComponent;

	@ViewChild('fieldDetailElement') fieldDetailElement:ElementRef;
	@ViewChildren('fieldDetail') fieldComponents: QueryList<DocumentFieldDetailComponent>;

	constructor(private sanitizer: DomSanitizer) {}

	private fieldIsPropertyField(): boolean {
		return (this.field instanceof PropertyField);
	}

	private getTransformationClass(): string {
		if (!this.field.partOfMapping || !this.field.partOfTransformation) {
			return "partOfMappingIcon partOfMappingIconHidden";
		}
		return "partOfMappingIcon fa fa-bolt";
	}

	private getMappingClass(): string {
		if (!this.field.partOfMapping) {
			return "partOfMappingIcon partOfMappingIconHidden";
		}
		var clz: string = "fa fa-circle";
		if (!this.field.isTerminal() && this.field.hasUnmappedChildren) {
			clz = "fa fa-adjust";
		}
		return "partOfMappingIcon " + clz;
	}

	private getCssClass(): string {
		var cssClass: string = "fieldDetail";
		if (this.field.selected) {
			cssClass += " selectedField";
		}
		if (!this.field.isTerminal()) {
			cssClass += " parentField";
		}
		if (!this.field.isSource()) {
			cssClass += " outputField";
		}
		if (!this.field.availableForSelection) {
			cssClass += " disableSelection";
		}
		return cssClass;
	}

	public getElementPosition(): any {
		var x: number = 0;
		var y: number = 0;
		
		var el: any = this.fieldDetailElement.nativeElement;
		while (el != null) {
			x += el.offsetLeft;
			y += el.offsetTop;
			el = el.offsetParent;
		}
		return { "x": x, "y":y };
	}

	public handleMouseOver(event: MouseEvent): void {
		if (this.field.isTerminal()) {
			this.lineMachine.handleDocumentFieldMouseOver(this, event, this.field.isSource());
		}
	}

	public getParentToggleClass() {
		return "arrow fa fa-angle-" + (this.field.collapsed ? "right" : "down");
	}

	public handleMouseClick(event: MouseEvent): void {
		this.cfg.mappingService.fieldSelected(this.field);		
		setTimeout(() => { 
			this.lineMachine.redrawLinesForMappings();
		}, 10);  				
	}	

	public getFieldDetailComponent(field: Field): DocumentFieldDetailComponent {
		if (this.field == field) {
			return this;
		}
        for (let c of this.fieldComponents.toArray()) {
        	var returnedComponent: DocumentFieldDetailComponent = c.getFieldDetailComponent(field);
        	if (returnedComponent != null) {
        		return returnedComponent;
        	}
        }
        return null;
    }  

    private editField(): void {
        var self: DocumentFieldDetailComponent = this;
        this.modalWindow.reset();
        this.modalWindow.confirmButtonText = "Save";
        this.modalWindow.parentComponent = this;
        this.modalWindow.headerText = "Create Property";
        this.modalWindow.nestedComponentInitializedCallback = (mw: ModalWindowComponent) => {
			var c: PropertyFieldEditComponent = mw.nestedComponent as PropertyFieldEditComponent;
			var pField: PropertyField = self.field as PropertyField;
			c.initialize(pField);
		};
        this.modalWindow.nestedComponentType = PropertyFieldEditComponent;   
        this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
            var c: PropertyFieldEditComponent = mw.nestedComponent as PropertyFieldEditComponent;
            var pField: PropertyField = self.field as PropertyField;
            pField.populateFromName();
            self.cfg.mappingService.saveCurrentMapping();
        };
        this.modalWindow.show();
    } 

    private removeField(): void {
    	var self: DocumentFieldDetailComponent = this;
    	this.modalWindow.reset();
		this.modalWindow.confirmButtonText = "Remove";
		this.modalWindow.parentComponent = this;
		this.modalWindow.headerText = "Remove Property?";
		this.modalWindow.message = "Are you sure you want to remove the '" + this.field.displayName + "' property?";
		this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {			
			self.cfg.mappings.removeFieldFromAllMappings(self.field);
			self.field.docDef.removeField(self.field);
			self.cfg.mappingService.saveCurrentMapping();
		};
		this.modalWindow.show();	
    }

    private getSpacerWidth(): SafeStyle {
    	var width: string = (this.field.fieldDepth * 30).toString();
    	return this.sanitizer.bypassSecurityTrustStyle("display:inline; margin-left:" + width + "px");
    }
}