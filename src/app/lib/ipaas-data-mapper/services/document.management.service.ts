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
import { ErrorHandlerService } from './error.handler.service';

@Injectable()
export class DocumentManagementService {	
	public cfg: ConfigModel;	
	public debugParsing: boolean = false;

	private updateFromSelectedFieldsSource = new Subject<void>();
	updateFromSelectedFields$ = this.updateFromSelectedFieldsSource.asObservable();	

	private documentsFetchedSource = new Subject<void>();
	documentsFetched$ = this.documentsFetchedSource.asObservable();	

	private headers: Headers = new Headers();

	constructor(private http: Http) { 
		this.headers.append("Content-Type", "application/json");		
	}

	public updateSearch(searchFilter: string, isInput: boolean): void {
		var docDef: DocumentDefinition = isInput ? this.cfg.inputDoc : this.cfg.outputDoc;

		for (let field of docDef.getAllFields()) {
			field.visible = false;
		}
		for (let field of docDef.getTerminalFields(false)) {
			this.updateSearchVisibilityForField(searchFilter, field);			
		}

		this.notifyUpdateFromSelectedFields();
	}

	private updateSearchVisibilityForField(searchFilter: string, field: Field): void {
		field.visible = (searchFilter == null || "" == searchFilter || field.name.toLowerCase().includes(searchFilter.toLowerCase()));
		if (field.visible) {
			var parentField = field.parentField;
			while (parentField != null) {
				parentField.visible = true;
				parentField.collapsed = false;
				parentField = parentField.parentField;
			}
		}
	}

	public initialize(): void {
		//fetch input doc
		var startTime: number = Date.now();
		var className: string = this.cfg.mappingInputJavaClass;
		var url: string = this.cfg.baseJavaServiceUrl + "class?className=" + className;
		this.http.get(url, {headers: this.headers}).toPromise()
			.then((res: Response) => { this.extractDocumentDefinitionData(res, true, startTime); })
			.catch((error: any) => { this.handleError("Error occurred while retrieving document fields.", error); } );

		//fetch output doc
		var className = this.cfg.mappingOutputJavaClass;
		var url: string = this.cfg.baseJavaServiceUrl + "class?className=" + className;
		this.http.get(url, {headers: this.headers}).toPromise()
			.then((res: Response) => { this.extractDocumentDefinitionData(res, false, startTime); })
			.catch((error: any) => { this.handleError("Error occurred while retrieving document fields.", error); } );

		this.cfg.mappingService.mappingUpdated$.subscribe(mappingDefinition => {
			this.cfg.inputDoc.updateFromMappings(this.cfg.mappings.mappings);
			this.cfg.outputDoc.updateFromMappings(this.cfg.mappings.mappings);
		});		
	}	

	private extractDocumentDefinitionData(res: Response, isInput: boolean, startTime: number): void {	  		
  		let body = res.json();  	

  		var docDef: DocumentDefinition = new DocumentDefinition();
		docDef.isInput = isInput;
  		docDef.name = body.JavaClass.fullyQualifiedName;	
  		docDef.uri = body.JavaClass.uri;
  		docDef.debugParsing = this.debugParsing;  

  		console.log("Loading document: " + docDef.name);
  		
  		if (this.debugParsing) {
  			console.log("Document JSON from Service.", body);
  			var jsonPretty = JSON.stringify(body,null,2); 
			console.log("Pretty formatted JSON.", jsonPretty);
		}

		if (body.JavaClass.status == "NOT_FOUND") {
			this.handleError("Could not load document. Document is not found: " + docDef.name, null);
			return;
		}  				

  		var fields: Field[] = docDef.fields;
  		for (let field of body.JavaClass.javaFields.javaField) {
  			var parsedField: Field = this.parseFieldFromDocument(field, docDef);
  			if (parsedField != null) {
  				fields.push(parsedField);
  			}
  		}

  		docDef.populateFromFields();

  		if (isInput) {
  			this.cfg.inputDoc = docDef;
  		} else {
  			this.cfg.outputDoc = docDef;
  		}

  		console.log("Finished fetching and parsing document '" + docDef.name + "' in " + (Date.now() - startTime) + "ms.");
  		this.documentsFetchedSource.next();	
	}	

	private parseFieldFromDocument(field: any, docDef: DocumentDefinition): Field {
		if (field != null && field.status == "NOT_FOUND") {
			console.error("Filtering missing field: " + field.name 
				+ " (" + field.className + "), parent class: " + docDef.name);
			return null;
		} else if (field != null && field.status == "BLACK_LIST") {
			console.log("Filtering black listed field: " + field.name 
				+ " (" + field.className + "), parent class: " + docDef.name);
			return null;
		} else if (field != null && field.enumeration == true) {
			docDef.enumFieldClasses.push(field.className);
			return null;
		}
		
		var parsedField: Field = new Field();
		parsedField.name = field.name;
		parsedField.type = field.type;
  		if (field.javaFields && field.javaFields.javaField && field.javaFields.javaField.length) {
	  		for (let childField of field.javaFields.javaField) {
	  			var parsedChild: Field = this.parseFieldFromDocument(childField, docDef);
	  			if (parsedChild != null) {
	  				parsedField.children.push(parsedChild);
	  			}
	  		}
  		}
		parsedField.serviceObject = field;  		  		
  		var className = field.className;

  		//TODO: temp fixes for missing twitter4j classes
  		if (className == "User") {
  			className = "twitter4j.User";
  		} else if (className == "URLEntity") {
  			className = "twitter4j.URLEntity";
  		} else if (className == "Scopes") {
  			className = "twitter4j.Scopes";
  		} else if (className == "Status") {
  			className = "twitter4j.Status";
  		} else if (className == "GeoLocation") {
  			className = "twitter4j.GeoLocation";
  		} else if (className == "Place") {
  			className = "twitter4j.Place";
  		}
  		field.className = className;

  		return parsedField;
	}

	public notifyUpdateFromSelectedFields(): void {
		this.updateFromSelectedFieldsSource.next();
	}	

	private handleError(message:string, error: any): void {
		if (error != null && error instanceof Response) {
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
}