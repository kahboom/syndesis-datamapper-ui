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

import { Field } from './field.model';
import { TransitionModel, TransitionMode, FieldAction,  } from './transition.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { ErrorInfo } from '../models/error.model';

import { DataMapperUtil } from '../common/data.mapper.util';

export class MappedField {
	public parsedPath: string;
	public field: Field = DocumentDefinition.getNoneField();
	public fieldActions: FieldAction[] = [];

	public updateSeparatorIndex(separatorModeEnabled: boolean): void {
		var firstFieldAction: FieldAction = (this.fieldActions.length > 1) ? this.fieldActions[0] : null;
		if (separatorModeEnabled) {
			if ((firstFieldAction == null) || !firstFieldAction.isSeparateMode) {
				firstFieldAction = new FieldAction();
				firstFieldAction.isSeparateMode = true;
				firstFieldAction.name = "Separate";
				firstFieldAction.argumentNames.push("Index");
				firstFieldAction.argumentValues.push("1");
				this.fieldActions = [firstFieldAction].concat(this.fieldActions);				
			}
		} else { //not separator mode
			if (firstFieldAction != null) {
				DataMapperUtil.removeItemFromArray(firstFieldAction, this.fieldActions);
			}

		}
	}

	public getSeparatorIndex(): string {
		var firstFieldAction: FieldAction = (this.fieldActions.length > 1) ? this.fieldActions[0] : null;
		if (firstFieldAction != null && firstFieldAction.isSeparateMode) {
			return firstFieldAction.argumentValues[0];
		}
		return null;
	}
}

export class FieldMappingPair {
	public sourceFields: MappedField[] = [new MappedField()];
	public targetFields: MappedField[] = [new MappedField()];	
	public transition: TransitionModel = new TransitionModel();	

	public constructor() { }

	public addField(field: Field, isSource: boolean): void {
		var mappedField: MappedField = new MappedField();
		mappedField.field = field;
		this.getMappedFields(isSource).push(mappedField);
	}

	public addMappedField(mappedField: MappedField, isSource: boolean): void {
		this.getMappedFields(isSource).push(mappedField);
	}

	public removeMappedField(mappedField: MappedField, isSource: boolean): void {
		DataMapperUtil.removeItemFromArray(mappedField, this.getMappedFields(isSource));
	}

	public getMappedFieldForField(field: Field, isSource: boolean): MappedField {
		for (let mappedField of this.getMappedFields(isSource)) {
			if (mappedField.field == field) {
				return mappedField;
			}
		}
		return null;
	}

	public getMappedFields(isSource: boolean): MappedField[] {
		return isSource ? this.sourceFields : this.targetFields;
	}

	public getFields(isSource: boolean): Field[] {
		var fields: Field[] = [];
		for (let mappedField of this.getMappedFields(isSource)) {
			fields.push(mappedField.field);
		}
		return fields;
	}

	public getAllFields(): Field[] {
		return this.getFields(true).concat(this.getFields(false));
	}

	public getAllMappedFields(): MappedField[] {
		return this.getMappedFields(true).concat(this.getMappedFields(false));
	}

	public isFieldMapped(field: Field): boolean {
		return this.getMappedFieldForField(field, field.isSource()) != null;
	}	

	public updateSeparatorIndexes(): void {
		var separateMode: boolean = this.transition.isSeparateMode();
		for (let mappedField of this.getMappedFields(false)) {
			mappedField.updateSeparatorIndex(separateMode);
		}
	}
}

export class MappingModel {
	public uuid: string;
	public fieldMappings: FieldMappingPair[] = [];
	public currentFieldMapping: FieldMappingPair = null;
	public validationErrors : ErrorInfo[] = [];
	
	public constructor() {
		this.uuid = "mapping." + Math.floor((Math.random() * 1000000) + 1).toString();
		this.fieldMappings.push(new FieldMappingPair());
	}	

	public getFirstFieldMapping(): FieldMappingPair {
		if (this.fieldMappings == null || (this.fieldMappings.length == 0)) {
			return null;
		}
		return this.fieldMappings[0];
	}

	public getLastFieldMapping(): FieldMappingPair {
		if (this.fieldMappings == null || (this.fieldMappings.length == 0)) {
			return null;
		}
		return this.fieldMappings[this.fieldMappings.length - 1];
	}

	public getCurrentFieldMapping(): FieldMappingPair {
		return (this.currentFieldMapping == null) ? this.getLastFieldMapping() : this.currentFieldMapping;
	}

	public addValidationError(message: string) {
		var e: ErrorInfo = new ErrorInfo();
		e.message = message;
		this.validationErrors.push(e);
	}

	public removeError(identifier: string) {
		for (var i = 0; i < this.validationErrors.length; i++) {
			if (this.validationErrors[i].identifier == identifier) {
				this.validationErrors.splice(i, 1);
				return;
			}
		}
	}

	public isCollectionMode(): boolean {
		for (let f of this.getAllFields()) {
			if (f.isInCollection()) {
				return true;
			}
		}
		return false;
	}

	public removeMappedPair(fieldPair: FieldMappingPair): void {
		DataMapperUtil.removeItemFromArray(fieldPair, this.fieldMappings);		
	}		

	public getMappedFields(isSource: boolean): MappedField[] {
		var fields: MappedField[] = [];
		for (let fieldPair of this.fieldMappings) {
			fields = fields.concat(fieldPair.getMappedFields(isSource));
		}
		return fields;
	}

	public isFieldMapped(field:Field, isSource:boolean): boolean {
		return this.getFields(isSource).indexOf(field) != -1;
	}

	public getAllMappedFields(): MappedField[] {
		return this.getMappedFields(true).concat(this.getMappedFields(false));
	}

	public getAllFields(): Field[] {
		return this.getFields(true).concat(this.getFields(false));
	}

	public getFields(isSource: boolean): Field[] {
		var fields: Field[] = [];
		for (let fieldPair of this.fieldMappings) {
			fields = fields.concat(fieldPair.getFields(isSource));
		}
		return fields;
	}

	public hasMappedFields(isSource: boolean): boolean {
		return this.getMappedFields(isSource).length != 0;
	}
}