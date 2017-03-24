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

import { Component, Input } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';

@Component({
	selector: 'mapping-field-detail',
	template: `
	  	<div class='fieldDetail' *ngIf="docDef && docDef.fields && docDef.fieldPaths" style="margin-bottom:5px;">	  		
   			<input type="text" style="width:94%; float:left;" [(ngModel)]="selectedFieldPath" 
   				[typeahead]="dataSource" typeaheadWaitMs="200" (typeaheadOnSelect)="selectionChanged($event)">
   			<a style='display:inline; float:right;' (click)="remove($event)">
   				<i class="fa fa-trash" aria-hidden="true"></i>
   			</a>
   			<div style="clear:both; height:0px;">&nbsp;</div>
	  	</div>
    `
})

export class MappingFieldDetailComponent { 	
	@Input() cfg: ConfigModel;
	@Input() selectedFieldPath: string;
	@Input() originalSelectedFieldPath: string;
	@Input() docDef: DocumentDefinition; 
	private lastFieldPath: string;
	private dataSource: Observable<any>;

	public constructor() {
		this.dataSource = Observable.create((observer: any) => {
			observer.next(this.executeSearch(this.selectedFieldPath));
		});
	}

	remove(event: MouseEvent): void {
		this.cfg.mappingService.removeMappedField(this.selectedFieldPath, this.docDef.isInput);
		this.cfg.mappingService.saveCurrentMapping();
	}

	selectionChanged(event: any):void {	
		console.log(event);
		if (this.lastFieldPath == null) {
			this.lastFieldPath = this.originalSelectedFieldPath;
		}
		this.cfg.mappingService.removeMappedField(this.lastFieldPath, this.docDef.isInput);
		var fieldPath: string = event.item;
		if (fieldPath != this.docDef.getNoneField().path) {
			this.cfg.mappingService.addMappedField(fieldPath, this.docDef.isInput);
			this.lastFieldPath = fieldPath;
		}
		console.log("Attempting to save current mapping, mapping detail selection changed.");
		this.cfg.mappingService.saveCurrentMapping();
	}

	public executeSearch(filter: string): string[] {
		var fieldNames: string[] = [];
		for (let field of this.docDef.getTerminalFields(true)) {
			if (filter == null || filter == "" 
				|| field.displayName.toLowerCase().indexOf(filter.toLowerCase()) != -1) {
				var fieldPath = field.path;
				if (field.path != "[None]" && this.cfg.showMappingDataType) {
					fieldPath = fieldPath + " (" + field.type + ")";
				}
				fieldNames.push(fieldPath);
			}   
			if (fieldNames.length > 9) {
				return fieldNames;
			}   
		}
		return fieldNames;
	}
}