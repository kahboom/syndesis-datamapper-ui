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

import { TransitionModel, TransitionMode, TransitionDelimiter } from '../models/transition.model';
import { MappingModel } from '../models/mapping.model';
import { Field } from '../models/field.model';
import { MappingDefinition } from '../models/mapping.definition.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { LookupTable, LookupTableEntry } from '../models/lookup.table.model';

export class MappingSerializer {
	public static serializeMappings(mappingDefinition: MappingDefinition, 
		sourceDoc: DocumentDefinition, targetDoc: DocumentDefinition): any {						
		var jsonMappings: any[] = [];
		var tables: LookupTable[] = [];
		for (let m of mappingDefinition.mappings) {
			try {
				var jsonMapping: any;
				if (m.transition.mode == TransitionMode.SEPARATE) {				
					var delimiter: string = (m.transition.delimiter == TransitionDelimiter.SPACE) ? "SPACE" : "COMMA";
					jsonMapping = {
						"jsonType": "com.mediadriver.atlas.v2.SeparateFieldMapping", 
						"inputField": MappingSerializer.serializeFields(m.inputFieldPaths, sourceDoc, m, false)[0],
						"outputFields": {
							"mappedField": MappingSerializer.serializeFields(m.outputFieldPaths, targetDoc, m, true)
						},
						"strategy": delimiter
					};	
				} else if (m.transition.mode == TransitionMode.ENUM) {
					jsonMapping = {
						"jsonType": "com.mediadriver.atlas.v2.LookupFieldMapping", 
						"inputField": MappingSerializer.serializeFields(m.inputFieldPaths, sourceDoc, m, false)[0],
						"outputField": MappingSerializer.serializeFields(m.outputFieldPaths, targetDoc, m, false)[0],
						"lookupTableName": m.transition.lookupTableName
					};
				} else {			
					jsonMapping = {
						"jsonType": "com.mediadriver.atlas.v2.MapFieldMapping", 
						"inputField": MappingSerializer.serializeFields(m.inputFieldPaths, sourceDoc, m, false)[0],
						"outputField": MappingSerializer.serializeFields(m.outputFieldPaths, targetDoc, m, false)[0]
					};								
				}
				jsonMappings.push(jsonMapping);
			} catch (e) {
				var input: any = { "sourceDoc": sourceDoc, "targetDoc": targetDoc, 
					"mapping": m, "mapping def": mappingDefinition};
				console.error("Caught exception while attempting to serialize mapping, skipping. ", { "input": input, "error": e})
			}
		}
				
		var serializedLookupTables: any[] = MappingSerializer.serializeLookupTables(mappingDefinition);
		let payload = {
			"AtlasMapping": {
				"jsonType": "com.mediadriver.atlas.v2.AtlasMapping",				
				"fieldMappings": {
					"fieldMapping": jsonMappings 
				},
				"name": mappingDefinition.name,
				"sourceUri": sourceDoc.uri,
				"targetUri": targetDoc.uri,
				"lookupTables": {
					"lookupTable": serializedLookupTables
				}
			}
		};
		return payload;
	}

	private static serializeLookupTables(mappingDefinition: MappingDefinition) {
		var tables: LookupTable[] = mappingDefinition.getTables();
		
		if (!tables || !tables.length) {
			return [];
		}

		var serializedTables: any[] = [];
		for (let t of tables) {
			var lookupEntries: any[] = [];
			for (let e of t.entries) {
				var serialized: any = {
					"sourceValue": e.sourceValue,
					"sourceType": e.sourceType,
					"targetValue": e.targetValue,
					"targetType": e.targetType
				};
				lookupEntries.push(serialized);
			}

			var serialized: any = {
				"lookupEntryList": {
					"lookupEntry": lookupEntries
				},
				"name": t.name
			}
			serializedTables.push(serialized);			
		}
		return serializedTables;
	}

	private static serializeFields(fieldPaths: string[], docDef: DocumentDefinition, 
		mapping:MappingModel, includeIndexes:boolean): any {
		var mappingFieldActions: any = null;		
		var fieldsJson: any[] = [];
		for (let fieldPath of fieldPaths) {
			if (docDef.getNoneField().path == fieldPath) {
				//do not include "none" options from drop downs in mapping
				continue;
			}
			var field: Field = docDef.getField(fieldPath);
			if (field == null) {
				throw new Error("Cannot find field with path: " + fieldPath);
			}
			if (includeIndexes) {
				var separatorIndex: string = mapping.fieldSeparatorIndexes[field.path];
				mappingFieldActions = {
					"fieldAction":[
						{
							"jsonType":"com.mediadriver.atlas.v2.MapAction",
							"index": (parseInt(separatorIndex) - 1)
						}
					]
				};
			}
			var fieldJson = {
				"jsonType":"com.mediadriver.atlas.v2.MappedField",
				"field": field.serviceObject,
				"fieldActions": mappingFieldActions
			};
			fieldsJson.push(fieldJson);
		}
		return fieldsJson;
	}
	
	public static deserializeMappings(json: any): MappingModel[] {
		var mappings: MappingModel[] = [];
		for (let fieldMapping of json.AtlasMapping.fieldMappings.fieldMapping) {
			var m: MappingModel = new MappingModel();
			var isSeparateMapping = (fieldMapping.jsonType == "com.mediadriver.atlas.v2.SeparateFieldMapping");
  			var isLookupMapping = (fieldMapping.jsonType == "com.mediadriver.atlas.v2.LookupFieldMapping");
  			var fieldPath: string = fieldMapping.inputField.field.path
  			MappingSerializer.addFieldIfDoesntExist(m.inputFieldPaths, fieldPath);
  			if (isSeparateMapping) {
  				m.transition.mode = TransitionMode.SEPARATE;
  				var d: TransitionDelimiter = TransitionDelimiter.COMMA;
  				d = (fieldMapping.strategy == "SPACE") ? TransitionDelimiter.SPACE: 
  				m.transition.delimiter = d;
  				var delimeter = (m.transition.delimiter == TransitionDelimiter.SPACE) ? "SPACE" : "COMMA";
  				
  				for (let outputField of fieldMapping.outputFields.mappedField) {
  					var fieldName: string = outputField.field.name;
  					fieldPath = outputField.field.path;	  					
  					if (outputField.fieldActions
  						&& outputField.fieldActions.fieldAction.length
  						&& outputField.fieldActions.fieldAction[0].index) {
  						var index: number = (outputField.fieldActions.fieldAction[0].index + 1)
  						m.fieldSeparatorIndexes[fieldName] = index.toString();
  					} else {
  						m.fieldSeparatorIndexes[fieldName] = "1";
  					}
		  			MappingSerializer.addFieldIfDoesntExist(m.outputFieldPaths, fieldPath);
  				}
  			} else if (isLookupMapping) {
  				console.log(fieldMapping);
  				m.transition.lookupTableName = fieldMapping.lookupTableName;
  				m.transition.mode = TransitionMode.ENUM;	  	
  				MappingSerializer.addFieldIfDoesntExist(m.outputFieldPaths, fieldMapping.outputField.field.path);
  			} else {
  				m.transition.mode = TransitionMode.MAP;	  			
	  			MappingSerializer.addFieldIfDoesntExist(m.outputFieldPaths, fieldMapping.outputField.field.path);
  			}	 	  					  			
  			mappings.push(m);
  		}	  	
  		return mappings;
	}

	public static deserializeLookupTables(jsonMapping: any): LookupTable[] {
		var tables: LookupTable[] = [];
		if (!jsonMapping.AtlasMapping || !jsonMapping.AtlasMapping.lookupTables
			|| !jsonMapping.AtlasMapping.lookupTables.lookupTable) {
			return tables;
		}
		for (let t of jsonMapping.AtlasMapping.lookupTables.lookupTable) {
			var table: LookupTable = new LookupTable();
			table.name = t.name;
			for (let entry of t.lookupEntryList.lookupEntry) {
				var parsedEntry: LookupTableEntry = new LookupTableEntry();
				parsedEntry.sourceValue = entry.sourceValue;
				parsedEntry.sourceType = entry.sourceType;
				parsedEntry.targetValue = entry.targetValue;
				parsedEntry.targetType = entry.targetType;
				table.entries.push(parsedEntry);
			}				
			console.log("parsed table:" + table.toString());
			tables.push(table);
		}
		return tables;
	}

	private static addFieldIfDoesntExist(fieldPaths: string[], fieldPath: string): void {
		for (let preexistingFieldPath of fieldPaths) {
			if (fieldPath == preexistingFieldPath) {
				return;
			}
		}
		fieldPaths.push(fieldPath);
	}
}