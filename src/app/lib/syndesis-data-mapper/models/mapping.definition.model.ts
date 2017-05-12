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

import { MappingModel, MappedField } from './mapping.model';
import { LookupTable } from '../models/lookup.table.model';
import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';
import { TransitionModel, TransitionMode } from './transition.model';
import { DocumentDefinition } from '../models/document.definition.model';

import { DataMapperUtil } from '../common/data.mapper.util';

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

	public detectTableIdentifiers() {
		for (let t of this.getTables()) {
			if (t.sourceIdentifier && t.targetIdentifier) {
				continue;
			}
			var tableChanged: boolean = false;
			var m: MappingModel = this.getFirstMappingForLookupTable(t.name);
			if (m != null) {
				for (let fieldPair of m.fieldMappings) {
					if (fieldPair.transition.lookupTableName == null) {
						continue;
					}
					if (!t.sourceIdentifier) {
						var inputField: Field = fieldPair.getFields(true)[0];
						if (inputField) {
							t.sourceIdentifier = inputField.className;
							tableChanged = true;
						}
					}
					if (!t.targetIdentifier) {
						var outputField: Field = fieldPair.getFields(false)[0];
						if (outputField) {						
							t.targetIdentifier = outputField.className;
							tableChanged = true;
						}					
					}	
				}			
			}
			if (tableChanged) {
				console.log("Detected lookup table source/target id: " + t.toString());
			}
		}
		for (let m of this.mappings) {
			this.initializeMappingLookupTable(m);
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

	public getFirstMappingForLookupTable(lookupTableName: string): MappingModel {
		for (let m of this.mappings) {
			for (let fieldPair of m.fieldMappings) {
				if (fieldPair.transition.lookupTableName == lookupTableName) {
					return m;
				}
			}
		}
		return null;
	}

	public removeStaleMappings(cfg: ConfigModel): void {
		console.log("Removing stale mappings. Current Mappings: " + this.mappings.length + ".", this.mappings);
		var index = 0;
		var sourceFieldPaths: string[] = [];
		for (let doc of cfg.sourceDocs) {
			sourceFieldPaths = sourceFieldPaths.concat(Field.getFieldPaths(doc.getAllFields()));
		}
		var targetSourcePaths: string[] = [];
		for (let doc of cfg.targetDocs) {
			targetSourcePaths = targetSourcePaths.concat(Field.getFieldPaths(doc.getAllFields()));
		}
		while (index < this.mappings.length) {
			var mapping: MappingModel = this.mappings[index];
			console.log("Checking if mapping is stale: " + mapping.uuid, mapping);
			var mappingIsStale: boolean = this.isMappingStale(mapping, sourceFieldPaths, targetSourcePaths);
			console.log("stale:" + mappingIsStale);
			if (mappingIsStale) {
				console.log("Removing stale mapping.", { "mapping": mapping, 
					"sourceDocs": cfg.sourceDocs, "targetDocs": cfg.targetDocs });
				this.mappings.splice(index, 1);
			} else {
				index++;
			}
		}
		console.log("Finished removing stale mappings.");
	}

	public isMappingStale(mapping: MappingModel, sourceFieldPaths: string[], targetSourcePaths: string[]): boolean {		
		for (var field of mapping.getFields(true)) {
			if (sourceFieldPaths.indexOf(field.path) == -1) {
				return true;
			}
		}
		for (var field of mapping.getFields(false)) {
			if (targetSourcePaths.indexOf(field.path) == -1) {
				return true;
			}
		}
		return false;
	}

	public initializeMappingLookupTable(m: MappingModel): void {
		console.log("Checking mapping for lookup table initialization: " + m.toString());
		for (let fieldPair of m.fieldMappings) {
			if (!(fieldPair.transition.mode == TransitionMode.ENUM
				&& fieldPair.transition.lookupTableName == null 
				&& fieldPair.getFields(true).length == 1
				&& fieldPair.getFields(false).length == 1)) {
					console.log("Not looking for lookuptable for mapping field pair.", fieldPair);
				return;
			}
			console.log("Looking for lookup table for field pair.", fieldPair);
			var inputClassName: string = null;
			var outputClassName: string = null;

			var inputField: Field = fieldPair.getFields(true)[0];
			if (inputField) {
				inputClassName = inputField.className;		
			}
			var outputField: Field = fieldPair.getFields(true)[0];
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
					fieldPair.transition.lookupTableName = table.name;
					console.log("Created lookup table for mapping.", m);
				} else {
					fieldPair.transition.lookupTableName = table.name;
					console.log("Initialized lookup table for mapping.", m)					
				}
			}
		}
	}

	public updateFieldPairsFromDocuments(cfg: ConfigModel): void {
		for (let mapping of this.mappings) {
			for (let fieldPair of mapping.fieldMappings) {
				for (let sourceDoc of cfg.sourceDocs) {
					for (let mappedField of fieldPair.getMappedFields(true)) {
						if (!mappedField.parsedPath) {
							continue;
						}
						mappedField.field = sourceDoc.getField(mappedField.parsedPath);
						if (mappedField.field) {
							mappedField.parsedPath = null;
						}
					}
				}

				for (let targetDoc of cfg.targetDocs) {
					for (let mappedField of fieldPair.getMappedFields(false)) {
						if (!mappedField.parsedPath) {
							continue;
						}
						mappedField.field = targetDoc.getField(mappedField.parsedPath);
						if (mappedField.field) {
							mappedField.parsedPath = null;
						}
					}					
				}
			}
		}
	}

	public getAllMappings(includeActiveMapping: boolean): MappingModel[] {
		var mappings: MappingModel[] = [].concat(this.mappings);
        if (this.activeMapping != null) {
        	mappings.push(this.activeMapping);
        }
        return mappings;
	}

	public findMappingsForField(field: Field): MappingModel[] {	
		var mappingsForField: MappingModel[] = [];	
		for (let m of this.mappings) {
			for (let fieldPair of m.fieldMappings) {
				if (fieldPair.isFieldMapped(field)) {
					mappingsForField.push(m);
				}
			}
		}
		return mappingsForField;
	}

	public removeMapping(m: MappingModel): boolean {
		return DataMapperUtil.removeItemFromArray(m, this.mappings);
	}

	public removeFieldFromAllMappings(field: Field): void {
		for (let mapping of this.mappings) {
			for (let fieldPair of mapping.fieldMappings) {
				var mappedField: MappedField = fieldPair.getMappedFieldForField(field, field.isSource());
				if (mappedField != null) {
					fieldPair.removeMappedField(mappedField, field.isSource());
				}
			}
		}
	}
}