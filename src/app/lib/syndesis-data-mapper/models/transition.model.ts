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
import { FieldMappingPair } from './mapping.model';

export class FieldAction {
    public isSeparateMode: boolean = false;
    public identifier: string;
    public name: string;
    public argumentValues: string[] = [];
    public argumentNames: string[] = [];
}

export class FieldActionConfig {
	public identifier: string;
    public name: string;
    public argumentNames: string[] = [];
    public forString: boolean = true;

    public appliesToField(field: Field): boolean { 
    	var type: string = (field == null) ? null : field.type;
    	if (type == null) {
    		return false;
    	}
    	if (this.forString) {
    	    var typeIsString: boolean = (["STRING", "CHAR"].indexOf(type) != -1);        	
    		return typeIsString;
    	}
    	var typeIsNumber: boolean = (["LONG", "INTEGER", "FLOAT", "DOUBLE"].indexOf(type) != -1);    
    	return typeIsNumber;    	
    }

    public populateActionField(action: FieldAction): void {
    	action.name = this.name;
    	action.identifier = this.identifier;
    	action.argumentNames = [];
    	action.argumentValues = [];
    	for (let argName of this.argumentNames) {
    		action.argumentNames.push(argName);
    		action.argumentValues.push("");
    	}
    }
}

export enum TransitionMode { MAP, SEPARATE, ENUM }    
export enum TransitionDelimiter { SPACE, COMMA }    

export class TransitionModel {
	public mode: TransitionMode = TransitionMode.MAP;
	public delimiter: TransitionDelimiter = TransitionDelimiter.SPACE;
	public lookupTableName: string = null;

	public static actionConfigs: FieldActionConfig[] = [];

	public getPrettyName() {
		if (this.mode == TransitionMode.SEPARATE) {
			return "Separate (" + ((this.delimiter == TransitionDelimiter.SPACE) ? "Space)" : "Comma)");
		} else if (this.mode == TransitionMode.ENUM) {
			return "Enum (table: " + this.lookupTableName + ")";
		}
		return "Map";
	}

	public isSeparateMode(): boolean {
		return this.mode == TransitionMode.SEPARATE;
	}

	public isEnumerationMode(): boolean {
		return this.mode == TransitionMode.ENUM;
	}

	public hasTransition(): boolean {
		return this.isSeparateMode() || this.isEnumerationMode();
	}
}