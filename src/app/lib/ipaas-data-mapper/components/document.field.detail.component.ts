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
import { Field } from '../models/field.model';   
import { DocumentDefinition } from '../models/document.definition.model';
import { MappingModel } from '../models/mapping.model';

import { DocumentManagementService } from '../services/document.management.service';

import { LineMachineComponent } from './line.machine.component';

@Component({
	selector: 'document-field-detail',
	template: `
		<div class="DocumentFieldDetailComponent" #fieldDetailElement on-mouseover='handleMouseOver($event)'>
			<div [attr.class]='getCssClass()' (click)="handleMouseClick($event)" *ngIf="field.visible">							
				<div style="float:left;">														
					<div style="display:inline-block; width:12px;" *ngIf="!docDef.isSource">
						<i [attr.class]='getMappingClass()'></i>
					</div>
					<div class="spacer" [attr.style]="getSpacerWidth()">&nbsp;</div>
					<div *ngIf="!field.isTerminal()" style="display:inline-block;">					
						<i [attr.class]="parentToggleClass"></i>
						<i class="fa fa-folder parentFolder"></i>
					</div>
		  			<label>{{field.displayName}}</label>
		  		</div>
		  		<div style="float:right; width:12px;" *ngIf="docDef.isSource">
		  			<i [attr.class]='getMappingClass()'></i>
		  		</div>
		  		<div style="clear:both; height:0px;">&nbsp;</div>
		  	</div>
		  	<div class="childrenFields" *ngIf="!field.isTerminal() && !field.collapsed">
		  		<document-field-detail #fieldDetail *ngFor="let f of field.children" 
					[field]="f" [docDef]="docDef" [lineMachine]="lineMachine" 
					[cfg]="cfg"></document-field-detail>
			</div>
		</div>	  	
    `
})

export class DocumentFieldDetailComponent { 
	@Input() cfg: ConfigModel;
	@Input() docDef: DocumentDefinition;
	@Input() field: Field;	
	@Input() lineMachine: LineMachineComponent;

	@ViewChild('fieldDetailElement') fieldDetailElement:ElementRef;
	@ViewChildren('fieldDetail') fieldComponents: QueryList<DocumentFieldDetailComponent>;

	private parentToggleClass: string = "arrow fa fa-angle-right";

	constructor(private sanitizer: DomSanitizer) {}

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
		if (!this.docDef.isSource) {
			cssClass += " outputField";
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
			this.lineMachine.handleDocumentFieldMouseOver(this, event);
		}
	}

	public handleMouseClick(event: MouseEvent): void {
		if (this.field.isTerminal()) {			
			if (this.field.selected) {
				// don't do anything, field is already a part of current mapping
				return;
			}
			var isSource: boolean = this.docDef.isSource;
			var mapping: MappingModel = this.cfg.mappings.activeMapping;
			if (mapping != null && (this.docDef.getSelectedFields().length != 0) 
				&& !mapping.isFieldInMapping(this.field.path, isSource)) {
				this.cfg.mappingService.deselectMapping();
			}			
			this.field.selected = !this.field.selected;		
			this.cfg.documentService.notifyUpdateFromSelectedFields();
			this.cfg.mappingService.saveCurrentMapping();
		} else { //parent field
			this.docDef.populateChildren(this.field);
			this.field.collapsed = !this.field.collapsed;
			this.parentToggleClass = "arrow fa fa-angle-" + (this.field.collapsed ? "right" : "down");
		}		
	}	

	public getFieldDetailComponent(fieldPath: string): DocumentFieldDetailComponent {
		if (this.field.path == fieldPath) {
			return this;
		}
        for (let c of this.fieldComponents.toArray()) {
        	var returnedComponent: DocumentFieldDetailComponent = c.getFieldDetailComponent(fieldPath);
        	if (returnedComponent != null) {
        		return returnedComponent;
        	}
        }
        return null;
    }  

    private getSpacerWidth(): SafeStyle {
    	var width: string = (this.field.fieldDepth * 30).toString();
    	return this.sanitizer.bypassSecurityTrustStyle("display:inline; margin-left:" + width + "px");
    }
}