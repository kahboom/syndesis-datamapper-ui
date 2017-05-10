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

import { Observable } from 'rxjs/Rx';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';

import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { MappingModel } from '../models/mapping.model';
import { TransitionModel, TransitionMode, TransitionDelimiter } from '../models/transition.model';
import { MappingDefinition } from '../models/mapping.definition.model';
import { LookupTable } from '../models/lookup.table.model';

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
		this.cfg.documentService.updateFromSelectedFields$.subscribe(() => {
			this.fieldSelectionChanged();
		});				          
	}

	public findMappingFiles(filter: string): Observable<string[]> {	
		return new Observable<string[]>((observer:any) => {
			var startTime: number = Date.now();
			var url = this.cfg.initCfg.baseMappingServiceUrl + "mappings" + (filter == null ? "" : "?filter=" + filter);
			this.http.get(url, {headers: this.headers}).toPromise()
				.then((res:Response) => {
					let body = res.json();
		  			var entries: any[] = body.StringMap.stringMapEntry;
		  			var mappingFileNames: string[] = [];
		  			for (let entry of entries) {
		  				mappingFileNames.push(entry.name);
		  			}
		  			console.log("Retreived " + mappingFileNames.length + " mapping file names in " 
		  				+ (Date.now() - startTime) + "ms.");
		  			observer.next(mappingFileNames);
		  			observer.complete();
				})
				.catch((error: any) => { 
					observer.error(error);
					observer.complete();
				} 
			);
		});  
	}

	public fetchMappings(mappingFileNames: string[], mappingDefinition: MappingDefinition): Observable<boolean> {	
  		return new Observable<boolean>((observer:any) => {
	  		if (mappingFileNames.length == 0) {
	  			console.log("No pre-existing mapping exists.");
	  			observer.complete();
	  			return;
	  		}
	  		var startTime: number = Date.now();

	  		var baseURL: string = this.cfg.initCfg.baseMappingServiceUrl + "mapping/";
	  		var operations: any[] = [];
	  		for (let mappingName of mappingFileNames) {
		  		var url: string = baseURL + mappingName;
		  		let operation = this.http.get(url).map((res:Response) => res.json());
		  		operations.push(operation);
		  	}       
		  	Observable.forkJoin(operations).subscribe((data:any[]) => {
		      	if (!data) {
		      		console.log("No pre-existing mappings were found.");
		      		observer.next(false);
		      		observer.complete();     	
		      		return;
		      	}
		      	console.log("Initializing from " + data.length + " fetched mappings.");
		      	for (let d of data) {
		      		this.deserializeMappingServiceJSON(d, mappingDefinition);
		      	}		      	
		      	
		      	console.log("Finished loading " + mappingDefinition.mappings.length + " mappings in " 
		      		+ (Date.now() - startTime) + "ms.");
				this.mappingUpdatedSource.next();
		      	observer.next(true);	 
		      	observer.complete();     	
		      },
		      (error:any) => { 
		      	observer.error(error);
		      	observer.complete();
		      }
		    );	    
		});
	}	

	public deserializeMappingServiceJSON(json: any, mappingDefinition: MappingDefinition): void {
		for (let mapping of MappingSerializer.deserializeMappings(json)) {
      		mappingDefinition.mappings.push(mapping);
      	}
      	for (let lookupTable of MappingSerializer.deserializeLookupTables(json)) {
      		mappingDefinition.addTable(lookupTable);
      	}	      	
      	if (json && json.AtlasMapping && json.AtlasMapping.name) {
      		mappingDefinition.name = json.AtlasMapping.name;
      	}
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
		return "Mapping uuid: " + m.uuid + ", inputs: {" + inputs + "}, outputs {" + outputs + "}, transition: "
			+ m.transition.getPrettyName() + "}.";
	}

	public saveCurrentMapping(): void {
		var m: MappingModel = this.cfg.mappings.activeMapping;		
		if (m == null) {
			console.log("Not saving current mapping. No current mapping selected.");
			return;
		} 

		var wasSaved: boolean = this.removeMappingInternal(m);
		var addCurrentMapping: boolean = true;

		var hasInputField: boolean = false;
		for (let fieldPath of m.inputFieldPaths) {
			if (fieldPath != this.cfg.sourceDocs[0].getNoneField().path) {
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
			if (fieldPath != this.cfg.targetDocs[0].getNoneField().path) {
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

	public serializeMappingsToJSON(mappingDefinition: MappingDefinition): any {
		var payload: any = MappingSerializer.serializeMappings(mappingDefinition, 
			this.cfg.sourceDocs[0], this.cfg.targetDocs[0]);
		
		/*
			var jsonVersion = JSON.stringify(payload);
			var jsonPretty = JSON.stringify(JSON.parse(jsonVersion),null,2); 
			console.log("JSON for saved mapping.", jsonPretty);
		*/		
		return payload;
	}

	public saveMappingToService(): void {
		var startTime: number = Date.now();		
		var payload: any = this.serializeMappingsToJSON(this.cfg.mappings);
		var url = this.cfg.initCfg.baseMappingServiceUrl + "mapping";
		this.http.put(url, JSON.stringify(payload), {headers: this.headers}).toPromise()
			.then((res:Response) => {
				this.printMappings("Saved Mappings.");
				console.log("Saved mappings to service in " + (Date.now() - startTime) + "ms.");
			})
			.catch((error: any) => { this.handleError("Error occurred while saving mapping.", error); } 
		);
	}

	public handleMappingSaveSuccess(saveHandler: Function): void {
		console.log("Handling mapping save success.");
		if (saveHandler != null) {
			saveHandler();
		}
		this.mappingUpdatedSource.next();
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
			this.mappingUpdatedSource.next();
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

	public findMappingsForField(fieldPath: string, isSource:boolean): MappingModel[] {	
		var mappingsForField: MappingModel[] = [];	
		for (let m of this.cfg.mappings.mappings) {
			var fieldPaths: string[] = isSource ? m.inputFieldPaths : m.outputFieldPaths;		
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

	public getMappedFields(isSource: boolean) : string[] {
		var result: string[] = [];
		for (let m of this.cfg.mappings.mappings) {
			var fieldPaths: string[] = isSource ? m.inputFieldPaths : m.outputFieldPaths;
			for (let fieldPath of fieldPaths) {
				result.push(fieldPath);
			}
		}
		return result;		
	}

	public removeMappedField(fieldPath:string, isSource: boolean): void {
		var fieldPaths: string[] = (isSource ? this.cfg.mappings.activeMapping.inputFieldPaths 
			: this.cfg.mappings.activeMapping.outputFieldPaths);
    	for (var i = 0; i < fieldPaths.length; i++) {
    		if (fieldPaths[i] == fieldPath) {
    			fieldPaths.splice(i, 1);
    			break;
    		}
    	}
    	var field: Field = this.cfg.getDoc(isSource).getField(fieldPath);
    	field.selected = false;
    	this.notifyActiveMappingUpdated(false);	
	}

	public addMappedField(fieldPath:string, isSource: boolean): void {
		var docDef: DocumentDefinition = this.cfg.getDoc(isSource);
		fieldPath = (fieldPath == null) ? docDef.getNoneField().path : fieldPath;
		var fieldsPaths: string[] = (isSource ? this.cfg.mappings.activeMapping.inputFieldPaths 
			: this.cfg.mappings.activeMapping.outputFieldPaths);
		fieldsPaths.push(fieldPath);  		
		var field: Field = docDef.getField(fieldPath);
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
		this.notifyActiveMappingUpdated(false);
	}

	public deselectMapping(): void {
		this.cfg.mappings.activeMapping = null;
		for (let d of this.cfg.getAllDocs()) {
			d.clearSelectedFields();
		}
		this.notifyActiveMappingUpdated(false);	
	}

	public fieldSelectionChanged(): void {
		var mapping: MappingModel = this.cfg.mappings.activeMapping;
		this.printMapping(mapping);
		var mappingIsNew: boolean = false;
		var selectedInputFields: Field[] = this.cfg.sourceDocs[0].getSelectedFields();
		var selectedOutputFields: Field[] = this.cfg.targetDocs[0].getSelectedFields();
		console.log("Selected fields.", { "input": selectedInputFields, "output": selectedOutputFields });
		if (mapping == null) { // no current mapping shown in detail panel, find or create one		
			if ((selectedInputFields.length == 0) && (selectedOutputFields.length == 0)) {		
				console.log("Not creating new mapping, no fields selected.");
				this.selectMapping(mapping, false);
				return;
			}
			var fieldToFind: Field = null;		
			var isSource: boolean = true;
			
			if ((selectedInputFields.length == 1) && (selectedOutputFields.length == 0)) {		
				fieldToFind = selectedInputFields[0];
			} 

			if ((selectedInputFields.length == 0) && (selectedOutputFields.length == 1)) {		
				fieldToFind = selectedOutputFields[0];
				isSource = false;
			} 
			
			var mappingsForField: MappingModel[] = (fieldToFind == null) ? null 
				: this.findMappingsForField(fieldToFind.path, isSource);
			if (mappingsForField && mappingsForField.length > 1) {
				console.log("Found " + mappingsForField.length + " existing mappings.");
				this.mappingSelectionRequiredSource.next(mappingsForField);
				return;
			} else if (mappingsForField && mappingsForField.length == 1) {
				console.log("Found existing mapping.");
				mapping = mappingsForField[0];
			} else if (mappingsForField == null || mappingsForField.length == 0) { //new mapping
				mappingIsNew = true;
				mapping = new MappingModel();
				mapping.inputFieldPaths = [].concat(this.getFieldPaths(selectedInputFields));
				mapping.outputFieldPaths = [].concat(this.getFieldPaths(selectedOutputFields));		
				for (let field of [].concat(selectedInputFields).concat(selectedOutputFields)) {
					if (field.enumeration) {
						mapping.transition.mode = TransitionMode.ENUM;							
					}			
				}
				console.log("Created new mapping.", mapping);
			}	
		} else { //mapping already selected, add/remove from it	
			mapping.inputFieldPaths = [].concat(this.getFieldPaths(selectedInputFields));
			mapping.outputFieldPaths = [].concat(this.getFieldPaths(selectedOutputFields));					
		}		

		this.cfg.mappings.initializeMappingLookupTable(mapping, this.cfg);

		this.selectMapping(mapping, mappingIsNew);
	}

	public selectMapping(m: MappingModel, mappingIsNew: boolean) {
		this.cfg.mappings.activeMapping = m;
		this.cfg.showMappingDetailTray = true;
		if (m == null) {
			this.cfg.sourceDocs[0].clearSelectedFields();
			this.cfg.targetDocs[0].clearSelectedFields();
		} else {
			this.cfg.sourceDocs[0].selectFields(m.inputFieldPaths);
			this.cfg.targetDocs[0].selectFields(m.outputFieldPaths);
		}
		this.notifyActiveMappingUpdated(mappingIsNew);	
	}

	public getFieldPaths(fields: Field[]): string[] {
		var paths: string[] = [];
			for (let field of fields) {
				paths.push(field.path);
			}
		return paths;
	}
}