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
import { TransitionModel, TransitionMode } from './transition.model';
import { DocumentDefinition } from '../models/document.definition.model';

export class FieldMappingPair {
	public sourceFields: Field[] = [];
	public targetFields: Field[] = [];	
	public parsedSourcePaths: string[] = [];
	public parsedTargetPaths: string[] = [];
	public transition: TransitionModel = new TransitionModel();	

	public constructor() { 
		this.transition.fieldPair = this;
	}

	public addField(field: Field, isSource: boolean): void {
		this.getFields(isSource).push(field);
	}

	public removeField(field: Field, isSource: boolean): void {
		var fields: Field[] = this.getFields(isSource);
		for (var i = 0; i < fields.length; i++) {
    		if (fields[i] == field) {
    			fields.splice(i, 1);
    			return;
    		}
    	}
	}

	public getFields(isSource: boolean): Field[] {
		return isSource ? this.sourceFields : this.targetFields;
	}

	public getAllFields(): Field[] {
		return this.getFields(true).concat(this.getFields(false));
	}

	public isFieldMapped(field: Field): boolean {
		return (this.getFields(field.isSource()).indexOf(field) != -1);
	}	
}

export class MappingModel {
	public uuid: string;
	public fieldMappings: FieldMappingPair[] = [];
	public currentFieldMapping: FieldMappingPair = null;
	
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

	public isCollectionMode(): boolean {
		for (let f of this.getAllMappedFields()) {
			if (f.isInCollection()) {
				return true;
			}
		}
		return false;
	}

	public removeMappedPair(fieldPair: FieldMappingPair): void {
		for (var i = 0; i < this.fieldMappings.length; i++) {
    		if (this.fieldMappings[i] == fieldPair) {
    			this.fieldMappings.splice(i, 1);
    			break;
    		}
    	}
	}		

	public getMappedFields(isSource: boolean): Field[] {
		var fields: Field[] = [];
		for (let fieldPair of this.fieldMappings) {
			fields = fields.concat(fieldPair.getFields(isSource));
		}
		return fields;
	}

	public isFieldhMapped(field:Field, isSource:boolean): boolean {
		var fields: Field[] = this.getMappedFields(isSource);
		return fields.indexOf(field) != -1;
	}

	public getAllMappedFields(): Field[] {
		return this.getMappedFields(true).concat(this.getMappedFields(false));
	}

	public hasMappedFields(isSource: boolean): boolean {
		return this.getMappedFields(isSource).length != 0;
	}
}