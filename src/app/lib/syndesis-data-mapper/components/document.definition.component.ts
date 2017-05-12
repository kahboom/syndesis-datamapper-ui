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

import { Component, Input, ViewChildren, ElementRef, QueryList, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl, SafeStyle} from '@angular/platform-browser';

import { ConfigModel } from '../models/config.model';
import { Field, PropertyField } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';

import { MappingManagementService } from '../services/mapping.management.service';
import { DocumentManagementService } from '../services/document.management.service';

import { DocumentFieldDetailComponent } from './document.field.detail.component';
import { PropertyFieldEditComponent } from './property.field.edit.component';

import { LineMachineComponent } from './line.machine.component';
import { ModalWindowComponent } from './modal.window.component';

@Component({
	selector: 'document-definition',
	template: `
	  	<div #documentDefinitionElement class='docDef' *ngIf="cfg && cfg.initCfg.initialized">
            <div class="card-pf">
      			<div class="card-pf-heading">
    				<h2 class="card-pf-title">
                        <div class="docName">
                            <i class="fa {{ isSource ? 'fa-hdd-o' : 'fa-download' }}"></i>
                           <label>{{ getSourcesTargetsLabel() }}</label>
                        </div>
                        <i class="fa fa-search searchBoxIcon link" (click)="toggleSearch()" [attr.style]="searchIconStyle"></i>
                        <div class="clear"></div>
                    </h2>
                    
    			</div>
                <div *ngIf="searchMode" class="searchBox">
                    <input type="text" #searchFilterBox 
                        id="search-filter-box" (keyup)="search(searchFilterBox.value)" placeholder="Search"
                        [(ngModel)]="searchFilter" />
                    <i class="fa fa-close searchBoxCloseIcon link" (click)="clearSearch()"></i>
                    <div class="clear"></div>
                </div>
    			<div [attr.class]="searchMode ? 'fieldListSearchOpen' : 'fieldList'" style="overflow:auto;" 
                    (scroll)="handleScroll($event)">
                    <div *ngFor="let docDef of cfg.getDocsWithoutPropertyDoc(isSource)">
                        <div class="card-pf-title documentHeader" tooltip="{{ docDef.fullyQualifiedName }}" placement="bottom">
                            <i class="fa {{ isSource ? 'fa-hdd-o' : 'fa-download' }}"></i>
                            <label>{{docDef.name}}</label>
                        </div>           
                        <document-field-detail #fieldDetail *ngFor="let f of docDef.fields" [modalWindow]="modalWindow"
                            [field]="f" [cfg]="cfg" [lineMachine]="lineMachine"></document-field-detail>     
                    </div>
                    <div *ngIf="isSource">
                        <div class="card-pf-title documentHeader">
                            <div style="float:left">
                                <i class="fa fa-hdd-o"></i>                        
                                <label>Properties</label>
                            </div>
                            <div style="float:right;"><i class="fa fa-plus link" (click)="addProperty()"></i></div>
                            <div class="clear"></div>
                        </div>
                        <document-field-detail #fieldDetail *ngFor="let f of cfg.propertyDoc.propertyFields" [modalWindow]="modalWindow"
                            [field]="f" [cfg]="cfg" [lineMachine]="lineMachine"></document-field-detail>   
                    </div>
    		    </div>
                <div class="card-pf-heading fieldsCount">{{ getFieldCount() }} fields</div>
            </div>
	    </div>
    `
})

export class DocumentDefinitionComponent { 
	@Input() cfg: ConfigModel;
    @Input() isSource: boolean = false;
    @Input() lineMachine: LineMachineComponent;
    @Input() modalWindow: ModalWindowComponent;

    private searchMode: boolean = false;
    private searchFilter: string = "";
    public searchIconStyle: SafeStyle;
    private scrollTop: number = 0;

    constructor(private sanitizer: DomSanitizer) {}   

    @ViewChild('documentDefinitionElement') documentDefinitionElement:ElementRef;    
    @ViewChildren('fieldDetail') fieldComponents: QueryList<DocumentFieldDetailComponent>;    

    private getSourcesTargetsLabel(): string {
        if (this.isSource) {
            return "Sources"
        } else {
            return (this.cfg.targetDocs.length > 1) ? "Targets" : "Target";
        }
    }

    private getFieldCount(): number {
        var count: number = 0;
        for (let docDef of this.cfg.getDocs(this.isSource)) {
            if (docDef && docDef.allFields) {
                count += docDef.allFields.length;            
            }
        }
        return count;
    }
    
    public getFieldDetailComponent(field: Field): DocumentFieldDetailComponent {
        for (let c of this.fieldComponents.toArray()) {
            var returnedComponent: DocumentFieldDetailComponent = c.getFieldDetailComponent(field);
            if (returnedComponent != null) {
                return returnedComponent;
            }
        }    
        return null;
    }    

    public getElementPosition(): any {
        var x: number = 0;
        var y: number = 0;
        
        var el: any = this.documentDefinitionElement.nativeElement;
        while (el != null) {
            x += el.offsetLeft;
            y += el.offsetTop;
            el = el.offsetParent;
        }
        y += this.scrollTop;
        return { "x": x, "y":y };
    }	

    public getFieldDetailComponentPosition(field: Field): any {
        var c: DocumentFieldDetailComponent = this.getFieldDetailComponent(field);
        if (c == null) {
            return null;
        }
        var fieldElementAbsPosition: any = c.getElementPosition();
        var myAbsPosition:any = this.getElementPosition();
        return { "x": (fieldElementAbsPosition.x - myAbsPosition.x), "y": (fieldElementAbsPosition.y - myAbsPosition.y) };
    }

    private search(searchFilter: string): void {
        for (let docDef of this.cfg.getDocs(this.isSource)) {
            for (let field of docDef.getAllFields()) {
                field.visible = false;
            }
            for (let field of docDef.getTerminalFields()) {
                field.visible = (searchFilter == null || "" == searchFilter 
                    || field.name.toLowerCase().includes(searchFilter.  toLowerCase()));
                if (field.visible) {
                    var parentField = field.parentField;
                    while (parentField != null) {
                        parentField.visible = true;
                        parentField.collapsed = false;
                        parentField = parentField.parentField;
                    }
                }
            }
        }
    }

    private clearSearch(): void  {
        this.searchFilter = "";
        this.search(this.searchFilter);
    }

    private handleScroll(event: MouseEvent) {
        var target: any = event.target;
        this.scrollTop = target.scrollTop;
        this.lineMachine.redrawLinesForMappings();
    }   

    private toggleSearch(): void  {
        this.searchMode = !this.searchMode;
        if (!this.searchMode) {
            this.clearSearch();
        }
        this.searchIconStyle = !this.searchMode ? null 
            : this.sanitizer.bypassSecurityTrustStyle("color:#5CBADF;");
    } 

    private addProperty(): void {
        var self: DocumentDefinitionComponent = this;
        this.modalWindow.reset();
        this.modalWindow.confirmButtonText = "Save";
        this.modalWindow.parentComponent = this;
        this.modalWindow.headerText = "Create Property";
        this.modalWindow.nestedComponentInitializedCallback = (mw: ModalWindowComponent) => {
            var c: PropertyFieldEditComponent = mw.nestedComponent as PropertyFieldEditComponent;
            c.initialize(null);
        };
        this.modalWindow.nestedComponentType = PropertyFieldEditComponent;   
        this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
            var c: PropertyFieldEditComponent = mw.nestedComponent as PropertyFieldEditComponent;
            self.cfg.propertyDoc.addField(c.getField());
            self.cfg.mappingService.saveCurrentMapping();
        };
        this.modalWindow.show();
    }  
}