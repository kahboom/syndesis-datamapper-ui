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
import { ConfigModel } from '../models/config.model';
import { TransitionModel, TransitionMode } from './transition.model';
import { DocumentDefinition } from '../models/document.definition.model';

export class FieldMappingPair {
	public inputFieldPaths: string[] = [];
	public outputFieldPaths: string[] = [];		
	public fieldSeparatorIndexes: { [key:string]:string; } = {};	

	public updateSeparatorIndexes(): void {
		for (let fieldPath of this.inputFieldPaths.concat(this.outputFieldPaths)) {
			if (this.fieldSeparatorIndexes[fieldPath] == null) {
				this.fieldSeparatorIndexes[fieldPath] = "1";
			}
		}
	}

	public toJSON(): any {
		var separatorsJson: any[] = [];
		for (let key in this.fieldSeparatorIndexes) {
            var value: string = this.fieldSeparatorIndexes[key];
            separatorsJson.push({ "key": key, "value": value });
        }
		return {
			"inputFieldPaths": this.inputFieldPaths,
			"outputFieldPaths": this.outputFieldPaths,
			"fieldSeparators": separatorsJson
		};
	}

    public fromJSON(json: any): void {
        this.inputFieldPaths = [].concat(json.inputFieldPaths);
        this.outputFieldPaths = [].concat(json.outputFieldPaths);
        if (json.fieldSeparators && json.fieldSeparators.length) {
        	for (let s of json.fieldSeparators) {
        		this.fieldSeparatorIndexes[s.key] = s.value;
        	}
        }        
    }
}

export class MappingModel {
	public uuid: string;
	public fieldMappings: FieldMappingPair[] = [];
	public transition: TransitionModel = new TransitionModel();	
	
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

	public isCollectionMode(cfg: ConfigModel): boolean {
		for (let f of this.getAllMappedFields(cfg)) {
			if (f.isInCollection()) {
				return true;
			}
		}
		return false;
	}

	public removeMappedFieldPath(fieldPath: string, fieldPair: FieldMappingPair, isSource: boolean): void {
		var fieldPaths: string[] = isSource ? fieldPair.inputFieldPaths : fieldPair.outputFieldPaths;			
		for (var i = 0; i < fieldPaths.length; i++) {
    		if (fieldPaths[i] == fieldPath) {
    			fieldPaths.splice(i, 1);
    			break;
    		}
    	}
	}

	public removeMappedPair(fieldPair: FieldMappingPair): void {
		for (var i = 0; i < this.fieldMappings.length; i++) {
    		if (this.fieldMappings[i] == fieldPair) {
    			this.fieldMappings.splice(i, 1);
    			break;
    		}
    	}
	}

	public addMappedFieldPath(fieldPath: string, fieldPair: FieldMappingPair, isSource: boolean): void {
		var fieldPaths: string[] = isSource ? fieldPair.inputFieldPaths : fieldPair.outputFieldPaths;
		fieldPaths.push(fieldPath);
	}

	public gettMappedFieldsFromPair(fieldPair: FieldMappingPair, isSource: boolean, cfg: ConfigModel) {
		var fieldPaths: string[] = isSource ? fieldPair.inputFieldPaths : fieldPair.outputFieldPaths;
		var docDef: DocumentDefinition = isSource ? cfg.sourceDocs[0] : cfg.targetDocs[0];
		return docDef.getFields(fieldPaths);
	}

	public getMappedFields(isSource: boolean, cfg: ConfigModel): Field[] {
		var fieldPaths: string[] = this.getMappedFieldPaths(isSource);
		var docDef: DocumentDefinition = isSource ? cfg.sourceDocs[0] : cfg.targetDocs[0];
		return docDef.getFields(fieldPaths);
	}

	public isFieldPathMapped(fieldPath:string, isSource:boolean): boolean {
		var fieldPaths: string[] = this.getMappedFieldPaths(isSource);
		return fieldPaths.indexOf(fieldPath) != -1;
	}

	public getAllMappedFields(cfg:ConfigModel): Field[] {
		return this.getMappedFields(true, cfg).concat(this.getMappedFields(false, cfg));
	}

	public getAllMappedFieldPaths(): string[] {
		return this.getMappedFieldPaths(true).concat(this.getMappedFieldPaths(false));
	}

	public hasMappedFields(isSource: boolean): boolean {
		var fieldPaths: string[] = this.getMappedFieldPaths(isSource);
		return (fieldPaths != null) && (fieldPaths.length > 0);
	}

	public getMappedFieldPaths(isSource: boolean): string[] {
		var fieldPaths: string[] = [];
		for (let fieldPair of this.fieldMappings) {
			fieldPaths = fieldPaths.concat(isSource ? fieldPair.inputFieldPaths : fieldPair.outputFieldPaths);			
		}
		return fieldPaths;		
	}

	public toJSON(): any {
        var fieldPairJSON: any[] = [];
        for (let fieldPair of this.fieldMappings) {
        	fieldPairJSON.push(fieldPair.toJSON());
        }
		return {
			"uuid": this.uuid,
			"fieldPairs": fieldPairJSON,
			"transition": this.transition.toJSON()
		};
	}

    public fromJSON(json: any): void {
    	this.uuid = json.uuid;
        this.transition.fromJSON(json.transition);
        if (json.fieldPairs && json.fieldPairs.length) {
        	this.fieldMappings = [];
        	for (let fp of json.fieldPairs) {
        		var fieldPair: FieldMappingPair = new FieldMappingPair;
        		fieldPair.fromJSON(fp);
        		this.fieldMappings.push(fieldPair);
        	}
        }
    }
}