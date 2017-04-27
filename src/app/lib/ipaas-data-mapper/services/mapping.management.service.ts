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

	private mappingSelectionRequiredSource = new Subject<Field>();
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

		var inputFieldExists: boolean = false;
		for (let field of m.getMappedFields(true)) {
			if (field != DocumentDefinition.getNoneField()) {
				inputFieldExists = true;
				break;
			}
		}

		var outputFieldExists: boolean = false;
		for (let field of m.getMappedFields(false)) {
			if (field != DocumentDefinition.getNoneField()) {
				outputFieldExists = true;
				break;
			}
		}

		if (outputFieldExists && inputFieldExists) {
			console.log("Saving current mapping.");
			this.cfg.mappings.mappings.push(m);
		} else if (wasSaved) {
			console.log("Removing current mapping.")
		}					
		this.saveMappingSource.next(null);			
	}

	public serializeMappingsToJSON(mappingDefinition: MappingDefinition): any {
		var payload: any = MappingSerializer.serializeMappings(this.cfg);
		var jsonVersion = JSON.stringify(payload);
		console.log("JSON for saved mapping.", jsonVersion);
		var jsonPretty = JSON.stringify(JSON.parse(jsonVersion),null,2); 
		console.log("JSON (pretty printed) for saved mapping.", [jsonPretty]);			
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

	public removeMappedField(field: Field, fieldPair: FieldMappingPair, isSource: boolean): void {
		fieldPair.removeField(field, isSource);     	
    	this.notifyMappingUpdated();	
	}

	public removeMappedPair(fieldPair: FieldMappingPair): void {
		this.cfg.mappings.activeMapping.removeMappedPair(fieldPair);
		if (this.cfg.mappings.activeMapping.fieldMappings.length == 0) {
			this.deselectMapping();
		} else {
    		this.notifyMappingUpdated();	
    	}
	}

	public addMappedPair(): FieldMappingPair {
		var fieldPair: FieldMappingPair = new FieldMappingPair();
		fieldPair.addField(DocumentDefinition.getNoneField(), true);
		fieldPair.addField(DocumentDefinition.getNoneField(), false);
		this.cfg.mappings.activeMapping.fieldMappings.push(fieldPair);
		this.notifyMappingUpdated();
		return fieldPair;
	}

	public addMappedField(field: Field, fieldPair: FieldMappingPair, isSource: boolean): void {
		field = (field == null) ? DocumentDefinition.getNoneField() : field;
		fieldPair.addField(field, isSource);
    	fieldPair.transition.updateSeparatorIndexes();
		this.notifyMappingUpdated();
	}

	public fieldSelected(field: Field): void {
		if (!field.isTerminal()) {
			field.docDef.populateChildren(field);
			field.collapsed = !field.collapsed;			
			return;
		}

		if (!field.availableForSelection) {
			this.cfg.errorService.warn("This field cannot be selected, " + field.selectionExclusionReason + ": " + field.displayName, null);
			return;
		}		

		var mapping: MappingModel = this.cfg.mappings.activeMapping;
		if (mapping == null) {
			var mappingsForField: MappingModel[] = this.cfg.mappings.findMappingsForField(field);
			if (mappingsForField && mappingsForField.length > 1) {
				console.log("Found " + mappingsForField.length + " existing mappings for selected field, prompting for mapping selection.", 
					{ "field": field, "mappings": mappingsForField });
				this.mappingSelectionRequiredSource.next(field);
				return;
			} else if (mappingsForField && mappingsForField.length == 1) {
				console.log("Found existing mapping for selected field.", { "field": field, "mappings": mappingsForField });
				mapping = mappingsForField[0];
			}
			if (mapping == null) {
				mapping = this.CreateNewMappingForSelectedField(field);
			}
			this.selectMapping(mapping);
			return;
		}

		//FIXME: if selection switches mapping into collection or enum mode we need to show warnings or prevent that when there are multiple targets or incompatible enum fields
				
		var latestFieldPair: FieldMappingPair = mapping.getCurrentFieldMapping();
		if (field.isSource()) {
			//Collection mode: wipe out previously selected source/target 
			//Non collection mode: only one source allowed in non collection mode pairings.
			latestFieldPair.getFields(field.isSource()).length = 0;				
		} else {
			//target field: wipe out last target in list
			var fields: Field[] = latestFieldPair.getFields(field.isSource());
			if (fields.length > 0) {
				fields.length = (fields.length - 1);
			}
		}
		latestFieldPair.addField(field, field.isSource());

		this.selectMapping(mapping);					
	}

	public CreateNewMappingForSelectedField(field: Field): MappingModel {
		var mapping: MappingModel = new MappingModel();
		var fieldPair: FieldMappingPair = mapping.getFirstFieldMapping();
		fieldPair.addField(field, field.isSource());
		if (field.enumeration) {
			fieldPair.transition.mode = TransitionMode.ENUM;							
		}			
		console.log("Created new mapping.", mapping);
		return mapping;
	}

	public selectMapping(m: MappingModel) {
		if (m == null) {
			this.deselectMapping();
			return;
		}
		console.log("Selecting active mapping.", m);
		this.cfg.mappings.activeMapping = m;
		this.cfg.showMappingDetailTray = true;
		for (let fieldPair of m.fieldMappings) {
			this.cfg.sourceDocs[0].selectFields(Field.getFieldPaths(fieldPair.getFields(true)));
			this.cfg.targetDocs[0].selectFields(Field.getFieldPaths(fieldPair.getFields(false)));
		}
		this.cfg.mappings.initializeMappingLookupTable(m);					
		this.saveCurrentMapping();
		this.notifyMappingUpdated();	
	}

	public deselectMapping(): void {
		console.log("Deselecting active mapping.", { "mapping": this.cfg.mappings.activeMapping });
		this.cfg.showMappingDetailTray = false;
		this.cfg.mappings.activeMapping = null;
		for (let d of this.cfg.getAllDocs()) {
			d.clearSelectedFields();
		}
		this.notifyMappingUpdated();	
	}	

	public notifyMappingUpdated(): void {
		this.mappingUpdatedSource.next();
	}

	private handleError(message:string, error: any): void {
		this.cfg.errorService.error(message, error);
	}	
}