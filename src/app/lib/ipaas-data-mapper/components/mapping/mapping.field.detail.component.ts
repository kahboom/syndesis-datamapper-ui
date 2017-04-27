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

import { ConfigModel } from '../../models/config.model';
import { Field } from '../../models/field.model';
import { DocumentDefinition } from '../../models/document.definition.model';
import { MappingModel, FieldMappingPair } from '../../models/mapping.model';

@Component({
	selector: 'mapping-field-detail',
	template: `
	  	<div class='fieldDetail' *ngIf="docDef && docDef.fields && docDef.fieldPaths" style="margin-bottom:5px;">	  		
	  		<div style="width:100%;">
   				<input type="text" [(ngModel)]="selectedFieldPath" [typeahead]="dataSource" typeaheadWaitMs="200" 
   					(typeaheadOnSelect)="selectionChanged($event)">
   			</div>   			
	  	</div>
    `
})

export class MappingFieldDetailComponent { 	
	@Input() cfg: ConfigModel;
	@Input() selectedFieldPath: string;
	@Input() originalSelectedFieldPath: string;
	@Input() docDef: DocumentDefinition; 
	@Input() fieldPair: FieldMappingPair;
	private lastFieldPath: string;
	private dataSource: Observable<any>;

	public getSelectedFieldPath(): string {
		var field: Field = this.docDef.getField(this.selectedFieldPath);
		var fieldPath: string = field.path;
		if (fieldPath != "[None]" && this.cfg.showMappingDataType) {
			fieldPath = fieldPath + " (" + field.type + ")";
		}
		return fieldPath;
	}

	public constructor() {
		this.dataSource = Observable.create((observer: any) => {
			observer.next(this.executeSearch(this.selectedFieldPath));
		});
	}

	selectionChanged(event: any):void {	
		//remove old field
		if (this.lastFieldPath == null) {
			this.lastFieldPath = this.originalSelectedFieldPath;
		}
		var fieldPath: string = this.extractFieldPath(this.lastFieldPath);
		var field: Field = this.docDef.getField(fieldPath);
		if (field == null) {
			console.error("Cannot find field to remove from mapping for path: '" + fieldPath + "'");
			return;
		}
		this.cfg.mappingService.removeMappedField(field, this.fieldPair, this.docDef.isSource);
		
		//add selected field
		fieldPath = this.extractFieldPath(event.item);
		if (fieldPath != DocumentDefinition.getNoneField().path) {
			field = this.docDef.getField(fieldPath);
			if (field == null) {
				console.error("Cannot find field to add to mapping for path: '" + fieldPath + "'");
				return;
			}
			this.cfg.mappingService.addMappedField(field, this.fieldPair, this.docDef.isSource);
			this.lastFieldPath = fieldPath;
		}
		//console.log("Attempting to save current mapping, mapping detail selection changed.");

		this.cfg.mappingService.saveCurrentMapping();
	}

	private extractFieldPath(fieldPath: string): string {
		if (fieldPath.indexOf(" (") != -1) {
			fieldPath = fieldPath.substr(0, fieldPath.indexOf(" ("));
		}
		return fieldPath;
	}

	public executeSearch(filter: string): string[] {
		var fieldNames: string[] = [];
		var fields: Field[] = [DocumentDefinition.getNoneField()].concat(this.docDef.getTerminalFields());
		for (let field of fields) {
			if (!field.availableForSelection) {
				continue;
			}
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