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

import { Field } from '../../models/field.model';
import { MappingModel, FieldMappingPair } from '../../models/mapping.model';
import { ConfigModel } from '../../models/config.model';

@Component({
	selector: 'mapping-field-action',
	template: `
		<div *ngIf="isSource == false && fieldPair && fieldPair.transition.isSeparateMode()" 
			style="margin-right:22px; margin-top:10px;">
			<label>Transformation</label>
			<div>
				<label style="width:32px; font-weight:normal; margin-left:2px;">Index:</label>
				<input type="text" [(ngModel)]="fieldPair.transition.fieldSeparatorIndexes[field.path]" 
					style="width:50px; text-align:right; font-size:11px;" (change)="selectionChanged($event)"/>
			</div>
		</div>
	`
})

export class MappingFieldActionComponent { 
	@Input() cfg: ConfigModel;
	@Input() fieldPair: FieldMappingPair;
	@Input() field: Field;
	@Input() isSource: boolean = false;

	selectionChanged(event: MouseEvent):void {	
		console.log("Changed field seperator for '" + this.field.path + "' to: " 
			+ this.fieldPair.transition.fieldSeparatorIndexes[this.field.path]);		
		this.cfg.mappingService.saveCurrentMapping();
	}
}