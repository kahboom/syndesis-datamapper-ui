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

import { Field } from '../models/field.model';
import { MappingModel } from '../models/mapping.model';
import { ConfigModel } from '../models/config.model';

@Component({
	selector: 'mapping-field-action',
	template: `
		<div *ngIf="isSource == false && cfg.mappings.activeMapping.transition.isSeparateMode()" 
			class="form-group" style="margin-right:22px;">
			<label>Transformation</label>
			<div>
				<label style="width:32px; font-weight:normal; margin-left:2px;">Index:</label>
				<input type="text" [(ngModel)]="cfg.mappings.activeMapping.fieldSeparatorIndexes[field.path]" 
					style="width:50px; text-align:right; font-size:11px;" (change)="selectionChanged($event)"/>
			</div>
		</div>
	`
})

export class MappingFieldActionComponent { 
	@Input() cfg: ConfigModel;
	@Input() field: Field;
	@Input() isSource: boolean = false;

	selectionChanged(event: MouseEvent):void {			
		this.cfg.mappingService.saveCurrentMapping();
	}
}