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

import { Component, Input, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { ConfigModel } from '../../models/config.model';
import { Field } from '../../models/field.model';
import { DocumentDefinition } from '../../models/document.definition.model';
import { MappingModel, FieldMappingPair, MappedField } from '../../models/mapping.model';

@Component({
	selector: 'mapping-field-detail',
	template: `
		<!-- our template for type ahead -->
		<template #typeaheadTemplate let-model="item" let-index="index">
  			<h5 style="font-style:italic;">{{ model['field'].docDef.name }}</h5>
  			<h5>{{ model['displayName'] }}</h5>
		</template>
	  	<div class='fieldDetail' style="margin-bottom:5px;">	  		
	  		<div style="width:100%;">
   				<input type="text" [ngModel]="getFieldLabel(mappedField.field)" [typeahead]="dataSource" typeaheadWaitMs="200" 
   					(typeaheadOnSelect)="selectionChanged($event)" typeaheadOptionField="displayName" [typeaheadItemTemplate]="typeaheadTemplate">
   			</div>   			
	  	</div>
    `
})

export class MappingFieldDetailComponent { 	
	@Input() cfg: ConfigModel;
	@Input() fieldPair: FieldMappingPair;
	@Input() isSource: boolean;
	@Input() mappedField: MappedField;

	public dataSource: Observable<any>;
	
	public constructor() {
		this.dataSource = Observable.create((observer: any) => {
			observer.next(this.executeSearch(observer.outerValue));
		});
	}

	selectionChanged(event: any): void {	
		this.mappedField.field = event.item["field"];
		this.cfg.mappingService.updateMappedField(this.fieldPair);
	}

	public getFieldLabel(field: Field): string {
		var fieldPath = field.path;
		if (field != DocumentDefinition.getNoneField() && this.cfg.showMappingDataType) {
			fieldPath = fieldPath + " (" + field.type + ")";
		}
		return fieldPath;
	}

	public executeSearch(filter: string): any[] {
		var formattedFields: any[] = [];
		var fields: Field[] = [DocumentDefinition.getNoneField()];
		for (let docDef of this.cfg.getDocs(this.isSource)) {
			fields = fields.concat(docDef.getTerminalFields());
		}
		for (let field of fields) {
			if (!field.availableForSelection) {
				continue;
			}
			var displayName = (field == null) ? "" : this.getFieldLabel(field);		
			var formattedField: any = { "field": field, "displayName": displayName };
			if (filter == null || filter == "" 
				|| formattedField["displayName"].toLowerCase().indexOf(filter.toLowerCase()) != -1) {				
				formattedFields.push(formattedField);
			}   
			if (formattedFields.length > 9) {
				break;
			}   
		}
		return formattedFields;
	}
}