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
import { MappingModel, FieldMappingPair } from '../models/mapping.model';
import { Field } from '../models/field.model';
import { MappingDefinition } from '../models/mapping.definition.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { LookupTable, LookupTableEntry } from '../models/lookup.table.model';
import { ConfigModel } from '../models/config.model';

export class MappingSerializer {
	public static serializeMappings(cfg: ConfigModel): any {						
		var jsonMappings: any[] = [];
		var tables: LookupTable[] = [];
		for (let m of cfg.mappings.mappings) {
			try {
				//FIXME: remove when collections is serializable
				if (m.isCollectionMode()) {
					continue;
				}
				//END FIXME
				for (let fieldPair of m.fieldMappings) {
					var serializedInputFields: any[] = MappingSerializer.serializeFields(fieldPair, true);
					var serializedOutputFields: any[] = MappingSerializer.serializeFields(fieldPair, false);
					var jsonMapping: any;

					if (fieldPair.transition.isSeparateMode()) {				
						var delimiter: string = (fieldPair.transition.delimiter == TransitionDelimiter.SPACE) ? "SPACE" : "COMMA";
						jsonMapping = {
							"jsonType": "com.mediadriver.atlas.v2.SeparateFieldMapping", 
							"inputField": serializedInputFields[0],
							"outputFields": {
								"mappedField": serializedOutputFields
							},
							"strategy": delimiter
						};	
					} else if (fieldPair.transition.isEnumerationMode()) {
						jsonMapping = {
							"jsonType": "com.mediadriver.atlas.v2.LookupFieldMapping", 
							"inputField": serializedInputFields[0],
							"outputField": serializedOutputFields[0],
							"lookupTableName": fieldPair.transition.lookupTableName
						};
					} else {			
						jsonMapping = {
							"jsonType": "com.mediadriver.atlas.v2.MapFieldMapping", 
							"inputField": serializedInputFields[0],
							"outputField": serializedOutputFields[0]
						};								
					}
					jsonMappings.push(jsonMapping);
				}
			} catch (e) {
				var input: any = { "sourceDoc": cfg.sourceDocs[0], "targetDoc": cfg.targetDocs[0], 
					"mapping": m, "mapping def": cfg.mappings};
				console.error("Caught exception while attempting to serialize mapping, skipping. ", { "input": input, "error": e})
			}
		}
				
		var serializedLookupTables: any[] = MappingSerializer.serializeLookupTables(cfg.mappings);
		var payload: any = {
			"AtlasMapping": {
				"jsonType": "com.mediadriver.atlas.v2.AtlasMapping",				
				"fieldMappings": {
					"fieldMapping": jsonMappings 
				},
				"name": cfg.mappings.name,
				"sourceUri": cfg.sourceDocs[0].uri,
				"targetUri": cfg.targetDocs[0].uri,
				"lookupTables": {
					"lookupTable": serializedLookupTables
				}
			}
		};
		return payload;
	}

	private static serializeLookupTables(mappingDefinition: MappingDefinition): any[] {
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

	private static serializeFields(fieldPair: FieldMappingPair, isSource: boolean): any[] {
		var fields: Field[] = fieldPair.getFields(isSource);
		var mappingFieldActions: any = null;		
		var fieldsJson: any[] = [];
		for (let field of fields) {
			if (DocumentDefinition.getNoneField().path == field.path) {
				//do not include "none" options from drop downs in mapping
				continue;
			}
			var includeIndexes: boolean = fieldPair.transition.isSeparateMode() && !isSource;
			if (includeIndexes) {
				var separatorIndex: string = fieldPair.transition.fieldSeparatorIndexes[field.path];
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
			var fieldPair: FieldMappingPair = m.getFirstFieldMapping();
			var isSeparateMapping = (fieldMapping.jsonType == "com.mediadriver.atlas.v2.SeparateFieldMapping");
  			var isLookupMapping = (fieldMapping.jsonType == "com.mediadriver.atlas.v2.LookupFieldMapping");
  			var fieldPath: string = fieldMapping.inputField.field.path;
  			MappingSerializer.addFieldIfDoesntExist(fieldPair.parsedSourcePaths, fieldPath);
  			if (isSeparateMapping) {
  				fieldPair.transition.mode = TransitionMode.SEPARATE;
  				var delimeter: TransitionDelimiter = TransitionDelimiter.COMMA;
  				delimeter = (fieldMapping.strategy == "SPACE") ? TransitionDelimiter.SPACE : delimeter;
  				fieldPair.transition.delimiter = delimeter;
  				
  				for (let outputField of fieldMapping.outputFields.mappedField) {
  					var fieldName: string = outputField.field.name;
  					fieldPath = outputField.field.path;	  					
  					if (outputField.fieldActions
  						&& outputField.fieldActions.fieldAction.length
  						&& outputField.fieldActions.fieldAction[0].index) {
  						var index: number = (outputField.fieldActions.fieldAction[0].index + 1)
  						fieldPair.transition.fieldSeparatorIndexes[fieldName] = index.toString();
  					} else {
  						fieldPair.transition.fieldSeparatorIndexes[fieldName] = "1";
  					}
		  			MappingSerializer.addFieldIfDoesntExist(fieldPair.parsedTargetPaths, fieldPath);
  				}
  			} else if (isLookupMapping) {
  				console.log(fieldMapping);
  				fieldPair.transition.lookupTableName = fieldMapping.lookupTableName;
  				fieldPair.transition.mode = TransitionMode.ENUM;	  	
  				MappingSerializer.addFieldIfDoesntExist(fieldPair.parsedTargetPaths, fieldMapping.outputField.field.path);
  			} else {
  				fieldPair.transition.mode = TransitionMode.MAP;	  			
	  			MappingSerializer.addFieldIfDoesntExist(fieldPair.parsedTargetPaths, fieldMapping.outputField.field.path);
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