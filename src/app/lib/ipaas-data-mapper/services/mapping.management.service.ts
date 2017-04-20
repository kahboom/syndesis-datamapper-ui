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
import { MappingModel, FieldMappingPair } from '../models/mapping.model';
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

	private mappingSelectionRequiredSource = new Subject<MappingModel[]>();
	mappingSelectionRequired$ = this.mappingSelectionRequiredSource.asObservable();	

	private headers: Headers = new Headers();
	
	constructor(private http: Http) { 
		this.headers.append("Content-Type", "application/json");		
	}	

	public initialize(): void {	}

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
				this.notifyMappingUpdated();
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

	public saveCurrentMapping(): void {
		var m: MappingModel = this.cfg.mappings.activeMapping;		
		if (m == null) {
			console.log("Not saving current mapping. No current mapping selected.");
			return;
		} 

		var wasSaved: boolean = this.cfg.mappings.removeMapping(m);
		var addCurrentMapping: boolean = true;

		var hasInputField: boolean = false;
		for (let fieldPath of m.getMappedFieldPaths(true)) {
			if (fieldPath != DocumentDefinition.getNoneField().path) {
				hasInputField = true;
				break;
			}
		}
		if (!hasInputField) {
			console.log("Not saving current mapping. No input fields selected.");
			addCurrentMapping = false;
		}

		var hasOutputField: boolean = false;
		for (let fieldPath of m.getMappedFieldPaths(false)) {
			if (fieldPath != DocumentDefinition.getNoneField().path) {
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
		var payload: any = MappingSerializer.serializeMappings(this.cfg);
		
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
				console.log("Saved mappings to service in " + (Date.now() - startTime) + "ms.", this.cfg.mappings);
			})
			.catch((error: any) => { this.handleError("Error occurred while saving mapping.", error); } 
		);
	}

	public handleMappingSaveSuccess(saveHandler: Function): void {
		console.log("Handling mapping save success.");
		if (saveHandler != null) {
			saveHandler();
		}
		this.notifyMappingUpdated();
	}

	public removeMapping(m: MappingModel): void {
		console.log("Removing mapping.", m);
		var mappingWasSaved: boolean = this.cfg.mappings.removeMapping(m);		
		if (mappingWasSaved) {
			var saveHandler: Function = (() => {
				this.deselectMapping();
			});
			this.saveMappingSource.next(saveHandler);					
		} else {	
			this.deselectMapping();
		}
	}	

	public findMappingsForField(fieldPath: string, isSource:boolean): MappingModel[] {	
		var mappingsForField: MappingModel[] = [];	
		for (let m of this.cfg.mappings.mappings) {
			if (m.isFieldPathMapped(fieldPath, isSource)) {
				mappingsForField.push(m);
			}
		}
		return mappingsForField;
	}

	public removeMappedField(fieldPath: string, fieldPair: FieldMappingPair, isSource: boolean): void {
		this.cfg.mappings.activeMapping.removeMappedFieldPath(fieldPath, fieldPair, isSource);     	
    	this.notifyMappingUpdated();	
	}

	public removeMappedPair(fieldPair: FieldMappingPair): void {
		this.cfg.mappings.activeMapping.removeMappedPair(fieldPair);
		if (this.cfg.mappings.activeMapping.fieldMappings.length == 0) {
			this.addMappedPair();
		} else {
    		this.notifyMappingUpdated();	
    	}
	}

	public addMappedPair(): void {
		var fieldPair: FieldMappingPair = new FieldMappingPair();
		fieldPair.inputFieldPaths.push(DocumentDefinition.getNoneField().path);
		fieldPair.outputFieldPaths.push(DocumentDefinition.getNoneField().path);
		this.cfg.mappings.activeMapping.fieldMappings.push(fieldPair);
		this.notifyMappingUpdated();
	}

	public addMappedField(fieldPath: string, fieldPair: FieldMappingPair, isSource: boolean): void {
		fieldPath = (fieldPath == null) ? DocumentDefinition.getNoneField().path : fieldPath;
		this.cfg.mappings.activeMapping.addMappedFieldPath(fieldPath, fieldPair, isSource);
    	this.cfg.mappings.activeMapping.getFirstFieldMapping().updateSeparatorIndexes();
		this.notifyMappingUpdated();
	}

	public deselectMapping(): void {
		console.log("Deselecting active mapping.");
		this.cfg.mappings.activeMapping = null;
		for (let d of this.cfg.getAllDocs()) {
			d.clearSelectedFields();
		}
		this.notifyMappingUpdated();	
	}

	public fieldSelectionChanged(): void {
		var mapping: MappingModel = this.cfg.mappings.activeMapping;
		var selectedInputFields: Field[] = this.cfg.sourceDocs[0].getSelectedFields();
		var selectedOutputFields: Field[] = this.cfg.targetDocs[0].getSelectedFields();
		var mappingIsNew: boolean = false;
		console.log("Selected fields.", { "input": selectedInputFields, "output": selectedOutputFields });
		if (mapping == null) { // no current mapping shown in detail panel, find or create one		
			if ((selectedInputFields.length == 0) && (selectedOutputFields.length == 0)) {		
				console.log("Not creating new mapping, no fields selected.");
				this.selectMapping(mapping);
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
				var fieldPair: FieldMappingPair = mapping.getFirstFieldMapping();
				fieldPair.inputFieldPaths = [].concat(this.getFieldPaths(selectedInputFields));
				fieldPair.outputFieldPaths = [].concat(this.getFieldPaths(selectedOutputFields));		
				for (let field of [].concat(selectedInputFields).concat(selectedOutputFields)) {
					if (field.enumeration) {
						mapping.transition.mode = TransitionMode.ENUM;							
					}			
				}
				console.log("Created new mapping.", mapping);
			}	
		} else { //mapping already selected, add/remove from it	
			var fieldPair: FieldMappingPair = mapping.getFirstFieldMapping();
			fieldPair.inputFieldPaths = [].concat(this.getFieldPaths(selectedInputFields));
			fieldPair.outputFieldPaths = [].concat(this.getFieldPaths(selectedOutputFields));					
		}		

		this.cfg.mappings.initializeMappingLookupTable(mapping, this.cfg);

		this.selectMapping(mapping);
	}

	public selectMapping(m: MappingModel) {
		this.cfg.mappings.activeMapping = m;
		this.cfg.showMappingDetailTray = true;
		if (m == null) {
			this.cfg.sourceDocs[0].clearSelectedFields();
			this.cfg.targetDocs[0].clearSelectedFields();
		} else {
			this.cfg.sourceDocs[0].selectFields(m.getMappedFieldPaths(true));
			this.cfg.targetDocs[0].selectFields(m.getMappedFieldPaths(false));
		}
		this.notifyMappingUpdated();	
	}

	public getFieldPaths(fields: Field[]): string[] {
		var paths: string[] = [];
			for (let field of fields) {
				paths.push(field.path);
			}
		return paths;
	}

	public notifyMappingUpdated(): void {
		this.mappingUpdatedSource.next();
	}

	private handleError(message:string, error: any): void {
		this.cfg.errorService.error(message, error);
	}	

}