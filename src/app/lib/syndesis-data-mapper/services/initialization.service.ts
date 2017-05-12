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
import { Field, EnumValue, PropertyField } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { MappingDefinition } from '../models/mapping.definition.model';

import { ErrorHandlerService } from './error.handler.service';
import { DocumentManagementService } from '../services/document.management.service';
import { MappingManagementService } from '../services/mapping.management.service';
import { ValidationService } from '../services/validation.service';

import { TransitionModel, FieldAction, FieldActionConfig } from '../models/transition.model';


@Injectable()
export class InitializationService {	
	public cfg: ConfigModel = new ConfigModel();
	private mappingInitialized: boolean = false;

	private systemInitializedSource = new Subject<void>();
	systemInitialized$ = this.systemInitializedSource.asObservable();	

	private initializationStatusChangedSource = new Subject<void>();
	initializationStatusChanged$ = this.initializationStatusChangedSource.asObservable();	

	/* TEST DATA CONFIG */
	private static testEnumMapping: boolean = false;
	private static addMockPropertyFields: boolean = false;
	private static addMockCollectionFields: boolean = true;
	private static addMockActionConfig: boolean = true;

	constructor(private documentService: DocumentManagementService, 
  		private mappingService: MappingManagementService, 
		private errorService: ErrorHandlerService, 
		private validationService: ValidationService) {
			console.log("Initialization Service being created.");
			this.cfg.documentService = documentService;
			this.cfg.mappingService = mappingService;
			this.cfg.errorService = errorService;
			this.cfg.initializationService = this;
			this.cfg.validationService = validationService;

			this.cfg.documentService.cfg = this.cfg;
			this.cfg.mappingService.cfg = this.cfg;
			this.cfg.validationService.cfg = this.cfg;

			this.cfg.documentService.initialize();
			this.cfg.mappingService.initialize();
			this.cfg.validationService.initialize();
		}
	
	public initialize(): void {
		console.log("Data Mapper UI is now initializing.");				

		if (InitializationService.testEnumMapping) {
			console.error("INIT SERVICE TEST DATA: ENUM mapping test mode enabled.");
			this.cfg.mappings = new MappingDefinition();
			this.cfg.sourceDocs[0].initCfg.documentIdentifier = "io.syndesis.connector.salesforce.Contact";
		}

		if (InitializationService.addMockActionConfig) {
			console.error("INIT SERVICE TEST DATA: Action config mode enabled.");
			this.addMockActionConfigs();			
		}		

		//load documents
		if (this.cfg.initCfg.classPath) {
			console.log("Classpath already provided, skipping Maven loading.");
			this.fetchDocuments();
		} else {
			console.log("Loading class path from Maven.");
			this.updateLoadingStatus("Loading Maven class path.");
			console.log(this.cfg.initCfg.loadingStatus);
			//fetch class path		
			this.cfg.documentService.fetchClassPath().subscribe(
				(classPath: string) => { 
					this.cfg.initCfg.classPath = classPath;
					console.log("ClassPath was fetched: " + classPath);
					this.fetchDocuments();
					this.updateStatus();
				},
				(error: any) => { this.handleError("could not load Maven class path.", error) }
			);
		}		

		//load mappings
		if (this.cfg.mappings != null) {
			console.log("Mapping data already provided, not loading.");
			this.mappingInitialized = true;
			this.updateStatus();
		} else {
			this.cfg.mappings = new MappingDefinition();
			if (this.cfg.mappingFiles.length > 0) {
				this.fetchMappings(this.cfg.mappingFiles);
			} else {
				console.log("Discovering mapping files.");
				this.cfg.mappingService.findMappingFiles("UI").subscribe(
					(files: string[]) => { this.fetchMappings(files); },
					(error: any) => { this.handleError("could not load mapping files.", error) }
				);
			}		
		}
	}	

	private fetchDocuments(): void {
		this.updateLoadingStatus("Loading source/target documents.");
		console.log("Loading source/target documents.");
		for (let docDef of this.cfg.getAllDocs()) {
			if (docDef == this.cfg.propertyDoc) {
				docDef.initCfg.initialized = true;
				continue;
			}
			this.cfg.documentService.fetchDocument(docDef, this.cfg.initCfg.classPath).subscribe(
				(docDef: DocumentDefinition) => { 
					console.log("Document was loaded: " + docDef.fullyQualifiedName, docDef);
					this.updateStatus();
				},
				(error: any) => { this.handleError("could not load document '" 
					+ docDef.initCfg.documentIdentifier + "'.", error) }
			);
		}
	}

	private fetchMappings(mappingFiles: string[]): void {
		console.log("Loading mappings from files: " + mappingFiles, mappingFiles);
		if (mappingFiles.length == 0) {
			console.log("No mapping files to load.")
			this.mappingInitialized = true;
			this.updateStatus();
			return;
		}
		this.cfg.mappingService.fetchMappings(mappingFiles, this.cfg.mappings).subscribe(
			(result:boolean) => {
				console.log("Finished loading mapping files.");
				this.mappingInitialized = true;
				this.updateStatus();
			},
			(error: any) => { this.handleError("could not load mapping definitions.", error) }
		);
	}

	private updateStatus(): void {
		var documentCount: number = this.cfg.getAllDocs().length;
		var finishedDocCount: number = 0;
		for (let docDef of this.cfg.getAllDocs()) {
			if (docDef.initCfg.initialized || docDef.initCfg.errorOccurred) {
				finishedDocCount++;
			}
		}
		
		console.log("Document load status: " + finishedDocCount + " of " + documentCount
			+ "\nMapping load status: " + (this.mappingInitialized ? "Loaded" : "Loading"));
		
		if ((documentCount == finishedDocCount) && this.mappingInitialized) {
			console.log("All documents and mappings are loaded, initializing data.");
			this.cfg.mappings.detectTableIdentifiers();
			this.cfg.mappings.updateFieldPairsFromDocuments(this.cfg);
			for (let d of this.cfg.getAllDocs()) {
				d.updateFromMappings(this.cfg.mappings, this.cfg);
				if (InitializationService.addMockCollectionFields && !d.isPropertyDoc) {
					console.error("INIT SERVICE TEST DATA: Adding mock collection fields to doc: " + d.name);
					for (let field of Field.createMockCollectionFields(null)) {
						d.addField(field);
					}
					
				}				
			}
			if (InitializationService.addMockPropertyFields) {
				console.error("INIT SERVICE TEST DATA: Adding mock property fields.");
				for (let field of PropertyField.createMockPropertyFields()) {
					this.cfg.propertyDoc.addField(field);
				}
			}
			this.cfg.mappings.removeStaleMappings(this.cfg);
			this.updateLoadingStatus("Initialization complete.");
			this.cfg.initCfg.initialized = true; 
			this.systemInitializedSource.next();
			console.log("Loaded mappings.", this.cfg.mappings);
			console.log("Data Mapper UI finished initializing.");
		}		
	}

	private addMockActionConfigs(): void {
		var actionCfg: FieldActionConfig = new FieldActionConfig();
		actionCfg.identifier = "lowercase";
		actionCfg.name = "Lowercase";
		TransitionModel.actionConfigs.push(actionCfg);
		
		actionCfg = new FieldActionConfig();
		actionCfg.identifier = "uppercase";
		actionCfg.name = "Uppercase";
		TransitionModel.actionConfigs.push(actionCfg);

		actionCfg = new FieldActionConfig();
		actionCfg.identifier = "substring";
		actionCfg.name = "Substring";
		actionCfg.argumentNames = ["Start Index", "Length"];
		TransitionModel.actionConfigs.push(actionCfg);

		actionCfg = new FieldActionConfig();
		actionCfg.identifier = "ceiling";
		actionCfg.name = "Ceiling";
		actionCfg.forString = false;
		TransitionModel.actionConfigs.push(actionCfg);

		actionCfg = new FieldActionConfig();
		actionCfg.identifier = "floor";
		actionCfg.name = "Floor";
		actionCfg.forString = false;
		TransitionModel.actionConfigs.push(actionCfg);

		actionCfg = new FieldActionConfig();
		actionCfg.identifier = "min";
		actionCfg.name = "Min";
		actionCfg.argumentNames = ["Compare To"];
		actionCfg.forString = false;		
		TransitionModel.actionConfigs.push(actionCfg);

		actionCfg = new FieldActionConfig();
		actionCfg.identifier = "max";
		actionCfg.name = "Max";
		actionCfg.argumentNames = ["Compare To"];
		actionCfg.forString = false;
		TransitionModel.actionConfigs.push(actionCfg);
	}

	private handleError(message: string, error:any ) {
		message = "Data Mapper UI Initialization Error: " + message;
		console.error(message, error); 
		this.updateLoadingStatus(message);	
		this.cfg.initCfg.initializationErrorOccurred = true;
		this.updateStatus();
	}	

	private updateLoadingStatus(status: string): void {
		this.cfg.initCfg.loadingStatus = status;
		this.initializationStatusChangedSource.next();
	}
}