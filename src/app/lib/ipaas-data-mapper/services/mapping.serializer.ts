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

export class MappingSerializer {
	private static uuidCounter: number = 0;

	public static serializeMappings(mappingDefinition: MappingDefinition, 
		inputDoc: DocumentDefinition, outputDoc: DocumentDefinition): any {						
		var jsonMappings: any[] = [];
		for (let m of mappingDefinition.mappings) {
			var isSeparateMapping: boolean = (m.transition.mode == TransitionMode.SEPARATE);
			var jsonMapping: any;
			if (isSeparateMapping) {				
				var delimiter: string = (m.transition.delimiter == TransitionDelimiter.SPACE) ? "SPACE" : "COMMA";
				jsonMapping = {
					"jsonType": "com.mediadriver.atlas.v2.SeparateFieldMapping", 
					"inputField": MappingSerializer.serializeFields(m.inputFieldPaths, inputDoc, m, false)[0],
					"outputFields": {
						"mappedField": MappingSerializer.serializeFields(m.outputFieldPaths, outputDoc, m, true)
					},
					"strategy": delimiter
				};	
			} else {			
				jsonMapping = {
					"jsonType": "com.mediadriver.atlas.v2.MapFieldMapping", 
					"inputField": MappingSerializer.serializeFields(m.inputFieldPaths, inputDoc, m, false)[0],
					"outputField": MappingSerializer.serializeFields(m.outputFieldPaths, outputDoc, m, false)[0]
				};								
			}
			jsonMappings.push(jsonMapping);
		}
		
		if (mappingDefinition.mappingUUID == null) {
			mappingDefinition.mappingUUID = "UI." + Math.floor((Math.random() * 1000000) + 1).toString();
		}
		let payload = {
			"AtlasMapping": {
				"jsonType": "com.mediadriver.atlas.v2.AtlasMapping",				
				"fieldMappings": {
					"fieldMapping": jsonMappings 
				},
				"name": mappingDefinition.mappingUUID,
				"sourceUri": inputDoc.uri,
				"targetUri": outputDoc.uri,
			}
		};
		return payload;
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
	
	public static deserializeMappings(jsonMappings: any[]): MappingModel[] {
		var mappings: MappingModel[] = [];
		console.log(jsonMappings);
		for (let jsonMapping of jsonMappings) {	
			for (let fieldMapping of jsonMapping.AtlasMapping.fieldMappings.fieldMapping) {
				var m: MappingModel = MappingSerializer.createMapping();
				var isSeparateMapping = (fieldMapping.jsonType == "com.mediadriver.atlas.v2.SeparateFieldMapping");
	  			m.transition.mode = isSeparateMapping ? TransitionMode.SEPARATE : TransitionMode.MAP;	  			
	  			//TODO: only supporting one input field right now.
	  			var f: Field = new Field();
	  			f.name = fieldMapping.inputField.field.name;
	  			f.type = fieldMapping.inputField.field.type;
	  			f.path = fieldMapping.inputField.field.path;
	  			f.serviceObject = fieldMapping.inputField.field;
	  			MappingSerializer.addFieldIfDoesntExist(m.inputFieldPaths, f.path);
	  			if (isSeparateMapping) {
	  				var d: TransitionDelimiter = TransitionDelimiter.COMMA;
	  				d = (fieldMapping.strategy == "SPACE") ? TransitionDelimiter.SPACE: 
	  				m.transition.delimiter = d;
	  				var delimeter = (m.transition.delimiter == TransitionDelimiter.SPACE) ? "SPACE" : "COMMA";
	  				for (let outputField of fieldMapping.outputFields.mappedField) {
	  					f = new Field();
	  					f.name = outputField.field.name;
	  					f.type = outputField.field.type;
	  					if (outputField.fieldActions
	  						&& outputField.fieldActions.fieldAction.length
	  						&& outputField.fieldActions.fieldAction[0].index) {
	  						var index: number = (outputField.fieldActions.fieldAction[0].index + 1)
	  						m.fieldSeparatorIndexes[f.name] = index.toString();
	  					} else {
	  						m.fieldSeparatorIndexes[f.name] = "1";
	  					}
		  				//TODO: calculate proper path

		  				f.path = outputField.field.path;
			  			f.serviceObject = outputField.field;
			  			MappingSerializer.addFieldIfDoesntExist(m.outputFieldPaths, f.path);
	  				}
	  			} else {
	  				f = new Field();
	  				f.name = fieldMapping.outputField.field.name;
	  				f.type = fieldMapping.outputField.field.type;
		  			f.path = fieldMapping.outputField.field.path;
		  			f.serviceObject = fieldMapping.outputField.field;
		  			MappingSerializer.addFieldIfDoesntExist(m.outputFieldPaths, f.path);
	  			}	 	  					  			
	  			mappings.push(m);
	  		}	  	
  		}
  		return mappings;
	}

	private static addFieldIfDoesntExist(fieldPaths: string[], fieldPath: string): void {
		for (let preexistingFieldPath of fieldPaths) {
			if (fieldPath == preexistingFieldPath) {
				return;
			}
		}
		fieldPaths.push(fieldPath);
	}

	public static createMapping(): MappingModel {
		var m: MappingModel = new MappingModel();
		m.uuid = "mapping #" + MappingSerializer.uuidCounter;
		MappingSerializer.uuidCounter++;
		return m;
	}
}