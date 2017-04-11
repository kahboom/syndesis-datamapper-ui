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

import { MappingModel } from './mapping.model';
import { LookupTable } from '../models/lookup.table.model';
import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';
import { TransitionModel, TransitionMode } from './transition.model';
import { DocumentDefinition } from '../models/document.definition.model';

export class MappingDefinition {	
	public name: string = null;
	public mappings: MappingModel[] = [];	
	public activeMapping: MappingModel = null;

	private tables: LookupTable[] = [];
	private tablesBySourceTargetKey: { [key:string]:LookupTable; } = {};
	private tablesByName: { [key:string]:LookupTable; } = {};

	public constructor() {
		this.name = "UI." + Math.floor((Math.random() * 1000000) + 1).toString();
	}

	public addTable(table: LookupTable): void {
		this.tablesBySourceTargetKey[table.getInputOutputKey()] = table;
		this.tablesByName[table.name] = table;
		this.tables.push(table);
	}

	public getTableByName(name: string): LookupTable {
		return this.tablesByName[name];
	}

	public detectTableIdentifiers(cfg: ConfigModel) {
		for (let t of this.getTables()) {
			if (t.sourceIdentifier && t.targetIdentifier) {
				continue;
			}
			var tableChanged: boolean = false;
			var m: MappingModel = this.getMappingForLookupTable(t.name);
			if (m != null) {
				if (cfg.sourceDocs[0] && !t.sourceIdentifier) {
					var inputField: Field = cfg.sourceDocs[0].getField(m.inputFieldPaths[0]);
					if (inputField) {
						t.sourceIdentifier = inputField.className;
						tableChanged = true;
					}
				}
				if (cfg.targetDocs[0] && !t.targetIdentifier) {
					var outputField: Field = cfg.targetDocs[0].getField(m.outputFieldPaths[0]);
					if (outputField) {						
						t.targetIdentifier = outputField.className;
						tableChanged = true;
					}					
				}				
			}
			if (tableChanged) {
				console.log("Detected lookup table source/target id: " + t.toString());
			}
		}
		for (let m of this.mappings) {
			this.initializeMappingLookupTable(m, cfg);
		}		
	}

	public getTableBySourceTarget(sourceIdentifier:string, targetIdentifier:string): LookupTable {
		var key: string = sourceIdentifier + ":" + targetIdentifier;
		return this.tablesBySourceTargetKey[key];
	}	

	public getTables(): LookupTable[] {
		var tables: LookupTable[] = [];
		for (let key in this.tablesByName) {
            var table: LookupTable = this.tablesByName[key];
            tables.push(table);
        }
        return tables;
	}

	public getMappingForLookupTable(lookupTableName: string): MappingModel {
		for (let m of this.mappings) {
			if (m.transition.lookupTableName == lookupTableName) {
				return m;
			}
		}
		return null;
	}

	public removeStaleMappings(cfg: ConfigModel): void {
		console.log("Removing stale mappings. Current Mappings: " + this.mappings.length + ".", this.mappings);
		var inputDoc: DocumentDefinition = cfg.sourceDocs[0];
		var outputDoc: DocumentDefinition = cfg.targetDocs[0];
		var index = 0;
		while (index < this.mappings.length) {
			var mapping: MappingModel = this.mappings[index];
			console.log("Checking if mapping is stale: " + mapping.uuid, mapping);
			var mappingIsStale: boolean = this.isMappingStale(mapping, inputDoc, outputDoc);
			console.log("stale:" + mappingIsStale);
			if (mappingIsStale) {
				console.log("Removing stale mapping.", { "mapping": mapping, 
					"inputDoc": inputDoc, "outputDoc": outputDoc });
				this.mappings.splice(index, 1);
			} else {
				index++;
			}
		}
		console.log("Finished removing stale mappings.");
	}

	public isMappingStale(mapping: MappingModel, inputDoc: DocumentDefinition, outputDoc: DocumentDefinition): boolean {		
		var inputFieldsExist: boolean = inputDoc.isFieldsExist(mapping.inputFieldPaths);
		var outputFieldsExist: boolean = outputDoc.isFieldsExist(mapping.outputFieldPaths);
		console.log("Blah", { "i": inputFieldsExist, "o": outputFieldsExist} );
		return !(inputFieldsExist && outputFieldsExist);
	}

	public initializeMappingLookupTable(m: MappingModel, cfg:ConfigModel): void {
		console.log("Checking mapping for lookup table initialization: " + m.toString());
		if (!(m.transition.mode == TransitionMode.ENUM
			&& m.transition.lookupTableName == null 
			&& m.inputFieldPaths.length == 1
			&& m.outputFieldPaths.length == 1)) {
				console.log("Not looking for lookuptable for mapping: " + m.toString());
			return;
		}
		console.log("Looking for lookup table for mapping: " + m.toString());
		var inputClassName: string = null;
		var outputClassName: string = null;

		var inputField: Field = cfg.sourceDocs[0].getField(m.inputFieldPaths[0]);
		if (inputField) {
			inputClassName = inputField.className;		
		}
		var outputField: Field = cfg.targetDocs[0].getField(m.outputFieldPaths[0]);
		if (outputField) {
			outputClassName = outputField.className;		
		}
		if (inputClassName && outputClassName) {
			var table: LookupTable = this.getTableBySourceTarget(inputClassName, outputClassName);
			if (table == null) {
				table = new LookupTable();
				table.sourceIdentifier = inputClassName;
				table.targetIdentifier = outputClassName;
				this.addTable(table);
				m.transition.lookupTableName = table.name;
				console.log("Created lookup table for mapping.", m);
			} else {
				m.transition.lookupTableName = table.name;
				console.log("Initialized lookup table for mapping.", m)					
			}
		}
	}

	public toJSON(): any {
        var mappingsJSON: any[] = [];
        for (let m of this.mappings) {
            mappingsJSON.push(m.toJSON());
        }
        var tablesJSON: any[] = [];
        for (let t of this.getTables()) {
            tablesJSON.push(t.toJSON());
        }
        return {
            "name": this.name,
            "mappings": mappingsJSON,
            "tables": tablesJSON
        };
    }

    public fromJSON(json: any): void {
        this.name = json.name;
        if (json.mappings && json.mappings.length) {
            for (let m of json.mappings) {
                var parsedMapping: MappingModel = new MappingModel();
                parsedMapping.fromJSON(m);
                this.mappings.push(parsedMapping);
            }
        }
        if (json.tables && json.tables.length) {
            for (let t of json.tables) {
                var parsedTable: LookupTable = new LookupTable();
                parsedTable.fromJSON(t);
                this.addTable(parsedTable);
            }
        }
    }
}