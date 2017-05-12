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

import { Component } from '@angular/core';

import { Field, PropertyField } from '../models/field.model';


@Component({
	selector: 'property-field-edit',
	template: `
		<div class="PropertyEditFieldComponent">
			<div class="form-group">
				<label>Name:</label>
				<input name="name" type="text" [(ngModel)]="field.name"/>
			</div>
			<div class="form-group">
				<label>Value:</label>
				<input name="value" type="text" [(ngModel)]="field.value"/>
			</div>
		</div>
	`
})

export class PropertyFieldEditComponent { 
	public field: PropertyField = new PropertyField();

	public initialize(field: PropertyField): void {
		this.field = field == null ? new PropertyField() : field;
	}

	public getField(): PropertyField {
		this.field.populateFromName();
		return this.field;
	}
}