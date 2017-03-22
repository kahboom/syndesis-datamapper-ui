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

import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions, Response, HttpModule } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/observable/forkJoin';
import { Subject } from 'rxjs/Subject';

import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { MappingModel } from '../models/mapping.model';
import { TransitionModel, TransitionMode, TransitionDelimiter } from '../models/transition.model';
import { MappingDefinition } from '../models/mapping.definition.model';

import { MappingSerializer } from './mapping.serializer';

import { ErrorHandlerService } from './error.handler.service';
import { DocumentManagementService } from './document.management.service';

@Injectable()
export class MappingManagementService {	
	public cfg: ConfigModel;

	private mappingUpdatedSource = new Subject<void>();
	mappingUpdated$ = this.mappingUpdatedSource.asObservable();	

	private saveMappingSource = new Subject<Function>();
	saveMappingOutput$ = this.saveMappingSource.asObservable();	

	private activeMappingChangedSource = new Subject<boolean>();
	activeMappingChanged$ = this.activeMappingChangedSource.asObservable();	

	private mappingSelectionRequiredSource = new Subject<MappingModel[]>();
	mappingSelectionRequired$ = this.mappingSelectionRequiredSource.asObservable();	

	private headers: Headers = new Headers();
	
	constructor(private http: Http) { 
		this.headers.append("Content-Type", "application/json");		
	}	

	public initialize(): void {
		console.log("Initializing mappings.");
		var startTime: number = Date.now();

		this.cfg.documentService.updateFromSelectedFields$.subscribe(() => {
			this.fieldSelectionChanged();
		});		

		var url = this.cfg.baseMappingServiceUrl + "mappings?filter=UI";
		this.http.get(url, {headers: this.headers}).toPromise()
			.then( (res:Response) => this.extractMappings(res, startTime))
			.catch((error: any) => { this.handleError("Error occurred while retrieving mappings.", error); } );             
	}

	private extractMappings(res: Response, startTime: number): void {	
  		let body = res.json();
  		var entries: any[] = body.StringMap.stringMapEntry;
  		var mappingNames: string[] = [];
  		for (let entry of entries) {
  			mappingNames.push(entry.name);
  		}

  		if (mappingNames.length == 0) {
  			console.log("No pre-existing mapping exists.");
  			return;
  		}

  		var baseURL: string = this.cfg.baseMappingServiceUrl + "mapping/";
  		var operations: any[] = [];
  		for (let mappingName of mappingNames) {
	  		var url: string = baseURL + mappingName;
	  		let operation = this.http.get(url).map((res:Response) => res.json());
	  		operations.push(operation);
	  	}       
	  	Observable.forkJoin(operations).subscribe(
	      (data:any) => {
	      	if (!data) {
	      		console.log("No pre-existing mappings were found.");
	      		return;
	      	}
	      	console.log("Initializing from " + data.length + " fetched mappings.");
	      	this.cfg.mappings.mappings = this.cfg.mappings.mappings.concat(
	      		MappingSerializer.deserializeMappings(data));
	      	if (data && data.length) {
	      		this.cfg.mappings.mappingUUID = data[0].AtlasMapping.name;
	      	}
	      	console.log("Finished loading mappings in " + (Date.now() - startTime) + "ms.");
	      	this.mappingUpdatedSource.next();
	      },
	      (err:any) => { this.handleError("Error occurred while retrieving a mapping.", err); }
	    );	    
	}		

	public notifyActiveMappingUpdated(mappingIsNew: boolean): void {
		this.activeMappingChangedSource.next(mappingIsNew);
	}

	public printMappings(reason: string): void {
		var mappings: MappingModel[] = this.cfg.mappings.mappings;
		var msg: string = "Mapping status for '" + reason + 
			"', current mapping count: " + mappings.length;
		for (var i = 0; i < mappings.length; i++) {
			msg += "\n\tMapping #" + i + ": " + this.printMapping(mappings[i]);
		}
		console.log(msg);
	}

	public printMapping(m: MappingModel): string {
		if (m == null) {
			return "[no mapping]";
		}
		var inputs: string = "";
		for (let fieldPath of m.inputFieldPaths) {
			inputs += fieldPath + ", ";
		}
		var outputs: string = "";
		for (let fieldPath of m.outputFieldPaths) {
			outputs += fieldPath + ", ";
		}
		return "uuid: " + m.uuid + ", inputs: {" + inputs + "}, outputs {" + outputs + "}.";
	}

	public saveCurrentMapping(): void {
		var m: MappingModel = this.cfg.mappings.activeMapping;
		var wasSaved: boolean = this.removeMappingInternal(m);
		var addCurrentMapping: boolean = true;
		if (m == null) {
			console.log("Not saving current mapping. No current mapping selected.");
			addCurrentMapping = false;
		} 

		var hasInputField: boolean = false;
		for (let fieldPath of m.inputFieldPaths) {
			if (fieldPath != this.cfg.inputDoc.getNoneField().path) {
				hasInputField = true;
				break;
			}
		}
		if (!hasInputField) {
			console.log("Not saving current mapping. No input fields selected.");
			addCurrentMapping = false;
		}

		var hasOutputField: boolean = false;
		for (let fieldPath of m.outputFieldPaths) {
			if (fieldPath != this.cfg.outputDoc.getNoneField().path) {
				hasOutputField = true;
				break;
			}
		}
		if (!hasOutputField) {
			addCurrentMapping = false;
			console.log("Not saving current mapping. No output fields selected.");
		}

		if (addCurrentMapping) {
			console.log("Saving current mapping.");
			this.cfg.mappings.mappings.push(m);
		} else if (wasSaved) {
			console.log("Removing current mapping.")
		}					
		this.saveMappingSource.next(null);			
	}

	public saveMappingToService(saveHandler: Function): void {
		var startTime: number = Date.now();
		var payload: any = MappingSerializer.serializeMappings(this.cfg.mappings, 
			this.cfg.inputDoc, this.cfg.outputDoc);
		var jsonVersion = JSON.stringify(payload);
		
		/*
		var jsonPretty = JSON.stringify(JSON.parse(jsonVersion),null,2); 
		console.log("JSON for saved mapping.", jsonPretty);
		*/		
		
		var url = this.cfg.baseMappingServiceUrl + "mapping";
		this.http.put(url, jsonVersion, {headers: this.headers}).toPromise()
			.then((res:Response) => { 
				if (saveHandler != null) {
					saveHandler();
				}
				this.printMappings("Saved Mappings.");
				console.log("Saved mappings to service in " + (Date.now() - startTime) + "ms.");
				this.mappingUpdatedSource.next();
			})
			.catch((error: any) => { this.handleError("Error occurred while saving mapping.", error); } 
		);
	}

	public removeMapping(m: MappingModel): void {
		console.log("Removing mapping: " + this.printMapping(m));
		var mappingWasSaved: boolean = this.removeMappingInternal(m);		
		if (mappingWasSaved) {
			var saveHandler: Function = (() => {
				this.deselectMapping();
			});
			this.saveMappingSource.next(saveHandler);					
		} else {	
			this.deselectMapping();
		}
	}

	private removeMappingInternal(m: MappingModel): boolean {
		var mappings: MappingModel[] = this.cfg.mappings.mappings;
		for (var i = 0; i < mappings.length; i++) {
			if (mappings[i].uuid == m.uuid) {
				mappings.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	public findMappingsForField(fieldPath: string, isInput:boolean): MappingModel[] {	
		var mappingsForField: MappingModel[] = [];	
		for (let m of this.cfg.mappings.mappings) {
			var fieldPaths: string[] = isInput ? m.inputFieldPaths : m.outputFieldPaths;		
			for (let currentFieldPath of fieldPaths) {
				if (currentFieldPath == fieldPath) {
					mappingsForField.push(m);
				}
			}
		}
		return mappingsForField;
	}

	private handleError(message:string, error: any): void {
		if (error instanceof Response) {
			if (error.status == 230) {
				message += " (Connection refused)";
			} else if (error.status == 500) {
				message += " (Internal Server Error)";
			} else if (error.status == 404) {
				message += " (Not Found)";
			}
		}
		this.cfg.errorService.error(message, error);
	}

	public getMappedFields(isInput: boolean) : string[] {
		var result: string[] = [];
		for (let m of this.cfg.mappings.mappings) {
			var fieldPaths: string[] = isInput ? m.inputFieldPaths : m.outputFieldPaths;
			for (let fieldPath of fieldPaths) {
				result.push(fieldPath);
			}
		}
		return result;		
	}

	public removeMappedField(fieldPath:string, isInput: boolean): void {
		var fieldPaths: string[] = (isInput ? this.cfg.mappings.activeMapping.inputFieldPaths 
			: this.cfg.mappings.activeMapping.outputFieldPaths);
    	for (var i = 0; i < fieldPaths.length; i++) {
    		if (fieldPaths[i] == fieldPath) {
    			fieldPaths.splice(i, 1);
    			break;
    		}
    	}
    	var field: Field = isInput ? this.cfg.inputDoc.getField(fieldPath) : this.cfg.outputDoc.getField(fieldPath);
    	field.selected = false;
    	this.activeMappingChangedSource.next(false);
	}

	public addMappedField(fieldPath:string, isInput: boolean): void {
		var docDef: DocumentDefinition = isInput ? this.cfg.inputDoc : this.cfg.outputDoc;
		fieldPath = (fieldPath == null) ? docDef.getNoneField().path : fieldPath;
		var fieldsPaths: string[] = (isInput ? this.cfg.mappings.activeMapping.inputFieldPaths 
			: this.cfg.mappings.activeMapping.outputFieldPaths);
		fieldsPaths.push(fieldPath);  		
		var field: Field = isInput ? docDef.getField(fieldPath) : docDef.getField(fieldPath);
		if (field != null) {
			field.selected = true;
			//make all parent fields visible too
            var parentField: Field = field.parentField;
            while (parentField != null) {
                parentField.collapsed = false;
                parentField = parentField.parentField;
            }
		}    	
    	this.cfg.mappings.activeMapping.updateSeparatorIndexes();
		this.activeMappingChangedSource.next(false);  	
	}

	public createMapping(): MappingModel {
		return MappingSerializer.createMapping();
	}

	public deselectMapping(): void {
		this.cfg.mappings.activeMapping = null;
		this.cfg.inputDoc.clearSelectedFields();
		this.cfg.outputDoc.clearSelectedFields();
		this.activeMappingChangedSource.next(false);
	}

	public fieldSelectionChanged(): void {
		var mapping: MappingModel = this.cfg.mappings.activeMapping;
		this.printMapping(mapping);
		var mappingIsNew: boolean = false;
		var selectedInputFields: Field[] = this.cfg.inputDoc.getSelectedFields();
		var selectedOutputFields: Field[] = this.cfg.outputDoc.getSelectedFields();
		if (mapping == null) { // no current mapping shown in detail panel, find or create one		
			if ((selectedInputFields.length == 0) && (selectedOutputFields.length == 0)) {		
				//no mapping, exit
				this.selectMapping(mapping, false);
				return;
			}
			var fieldToFind: Field = null;		
			var isInput: boolean = true;
			
			if ((selectedInputFields.length == 1) && (selectedOutputFields.length == 0)) {		
				fieldToFind = selectedInputFields[0];
			} 

			if ((selectedInputFields.length == 0) && (selectedOutputFields.length == 1)) {		
				fieldToFind = selectedOutputFields[0];
				isInput = false;
			} 
			
			var mappingsForField: MappingModel[] = (fieldToFind == null) ? null 
				: this.findMappingsForField(fieldToFind.path, isInput);
			if (mappingsForField && mappingsForField.length > 1) {
				console.log("Found " + mappingsForField.length + " existing mappings.");
				this.mappingSelectionRequiredSource.next(mappingsForField);
				return;
			} else if (mappingsForField && mappingsForField.length == 1) {
				console.log("Found existing mapping.");
				mapping = mappingsForField[0];
			} else if (mappingsForField == null || mappingsForField.length == 0) { //new mapping
				console.log("Creating new mapping.")
				mappingIsNew = true;
				mapping = this.createMapping();
				mapping.inputFieldPaths = [].concat(this.getFieldPaths(selectedInputFields));
				mapping.outputFieldPaths = [].concat(this.getFieldPaths(selectedOutputFields));
			}			
		} else { //mapping already selected, add/remove from it	
			mapping.inputFieldPaths = [].concat(this.getFieldPaths(selectedInputFields));
			mapping.outputFieldPaths = [].concat(this.getFieldPaths(selectedOutputFields));		
		}
		this.selectMapping(mapping, mappingIsNew);
	}

	public selectMapping(m: MappingModel, mappingIsNew: boolean) {
		this.cfg.mappings.activeMapping = m;
		this.cfg.showMappingDetailTray = true;
		if (m == null) {
			this.cfg.inputDoc.clearSelectedFields();
			this.cfg.outputDoc.clearSelectedFields();
		} else {
			this.cfg.inputDoc.selectFields(m.inputFieldPaths);
			this.cfg.outputDoc.selectFields(m.outputFieldPaths);
		}
		this.activeMappingChangedSource.next(mappingIsNew);	
	}

	public getFieldPaths(fields: Field[]): string[] {
		var paths: string[] = [];
			for (let field of fields) {
				paths.push(field.path);
			}
		return paths;
	}
}