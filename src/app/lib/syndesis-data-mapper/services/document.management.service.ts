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
import { Field, EnumValue } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { ErrorHandlerService } from './error.handler.service';

@Injectable()
export class DocumentManagementService {	
	public cfg: ConfigModel;	
	public debugParsing: boolean = false;

	private headers: Headers = new Headers();

	constructor(private http: Http) { 
		this.headers.append("Content-Type", "application/json");		
	}

	public initialize(): void {
		this.cfg.mappingService.mappingUpdated$.subscribe(mappingDefinition => {
			for (var d of this.cfg.getAllDocs()) {
				if (d.initCfg.initialized) {
					d.updateFromMappings(this.cfg.mappings, this.cfg);
				}
			}
		});		
	}	

	public fetchClassPath(): Observable<string> {
		return new Observable<string>((observer:any) => {
			var startTime: number = Date.now();
			var requestBody = {
				"MavenClasspathRequest": {
					"jsonType": "com.mediadriver.atlas.java.v2.MavenClasspathRequest",
					"pomXmlData": this.cfg.initCfg.pomPayload,
					"executeTimeout": this.cfg.initCfg.classPathFetchTimeoutInMilliseconds
				}	
			}
			if (this.cfg.debugParsing) {
				console.log("class path payload: " + JSON.stringify(requestBody), requestBody);
			}
			var url: string = this.cfg.initCfg.baseJavaServiceUrl + "mavenclasspath";
			this.http.post(url, requestBody, { headers: this.headers }).toPromise()
				.then((res: Response) => {
					let body: any = res.json();   
					if (this.cfg.debugParsing) {
						console.log("class path response: " + JSON.stringify(body), body);
					}
					var classPath: string = body.MavenClasspathResponse.classpath;
					console.log("Finished fetching class path '" + classPath + "' in " 
						+ (Date.now() - startTime) + "ms.");
	  				observer.next(classPath);
					observer.complete();
				})
				.catch((error: any) => { 
					observer.error(error);
					observer.complete();
				} 
			);
		});
	}

	public fetchDocument(docDef: DocumentDefinition, classPath:string): Observable<DocumentDefinition> {
		return new Observable<DocumentDefinition>((observer:any) => {
			var startTime: number = Date.now();
			var payload: any = this.createDocumentFetchRequest(docDef, classPath);			
			var url: string = this.cfg.initCfg.baseJavaServiceUrl + "class";
			console.log("Fetching document: " + docDef.initCfg.documentIdentifier, payload);
			this.http.post(url, payload, { headers: this.headers }).toPromise()
				.then((res: Response) => { 
					this.extractDocumentDefinitionData(res, docDef); 
					console.log("Finished fetching and parsing document '" + docDef.name + "' in " 
						+ (Date.now() - startTime) + "ms.");
	  				observer.next(docDef);
					observer.complete();
				})
				.catch((error: any) => { 
					observer.error(error);
					observer.complete();
				} 
			);
		});
	}

	private createDocumentFetchRequest(docDef: DocumentDefinition, classPath:string): any {
		var className: string = docDef.initCfg.documentIdentifier;
		var payload: any = {
			"ClassInspectionRequest": {
				"jsonType":"com.mediadriver.atlas.java.v2.ClassInspectionRequest",
				"classpath": classPath,
				"className": className,
				"disablePrivateOnlyFields": this.cfg.initCfg.disablePrivateOnlyFields,
				"disableProtectedOnlyFields": this.cfg.initCfg.disableProtectedOnlyFields,
				"disablePublicOnlyFields": this.cfg.initCfg.disablePublicOnlyFields,
				"disablePublicGetterSetterFields": this.cfg.initCfg.disablePublicGetterSetterFields
			}
		}
		if (this.cfg.initCfg.fieldNameBlacklist && this.cfg.initCfg.fieldNameBlacklist.length) {
			payload["ClassInspectionRequest"]["fieldNameBlacklist"] = { "string": this.cfg.initCfg.fieldNameBlacklist };
		}
		if (this.cfg.initCfg.classNameBlacklist && this.cfg.initCfg.classNameBlacklist.length) {
			payload["ClassInspectionRequest"]["classNameBlacklist"] = { "string": this.cfg.initCfg.classNameBlacklist };
		}
		return payload;
	}

	private extractDocumentDefinitionData(res: Response, docDef: DocumentDefinition): void {	  		
  		let body: any = res.json().ClassInspectionResponse;  

  		docDef.name = body.javaClass.className;
  		//Make doc name the class name rather than fully qualified name
  		if (docDef.name && docDef.name.indexOf(".") != -1) {
  			docDef.name = docDef.name.substr(docDef.name.lastIndexOf(".") + 1);
  		}
  		
  		docDef.fullyQualifiedName = body.javaClass.className;
  		if (docDef.name == null) {
  			console.error("Document's className is empty.", body.javaClass);
  		}
		console.log("Loading document: " + docDef.name, body);
  		docDef.uri = body.javaClass.uri;
  		docDef.debugParsing = this.debugParsing;    		
  		
  		if (this.debugParsing) {
  			console.log("Document JSON from Service.", body);
  			var jsonPretty = JSON.stringify(body,null,2); 
			console.log("Pretty formatted JSON.", jsonPretty);
		}

		if (body.javaClass.status == "NOT_FOUND") {
			this.handleError("Could not load document. Document is not found: " + docDef.name, null);
			return;
		}  				

  		var fields: Field[] = docDef.fields;
  		for (let field of body.javaClass.javaFields.javaField) {
  			var parsedField: Field = this.parseFieldFromDocument(field, docDef);
  			if (parsedField != null) {
  				fields.push(parsedField);
  			}
  		}

  		docDef.populateFromFields();  
  		docDef.initCfg.initialized = true;		  		
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
		}
		
		var parsedField: Field = new Field();
		parsedField.name = field.name;
		parsedField.type = field.type;  	
  		parsedField.className = field.className;
  		parsedField.enumeration = field.enumeration;
  		parsedField.serviceObject = field;  

		if (parsedField.enumeration && field.javaEnumFields && field.javaEnumFields.javaEnumField) {
			for (let enumValue of field.javaEnumFields.javaEnumField) {
				var parsedEnumValue: EnumValue = new EnumValue();
				parsedEnumValue.name = enumValue.name;
				parsedEnumValue.ordinal = enumValue.ordinal;
				parsedField.enumValues.push(parsedEnumValue);
          	}
          	if (this.debugParsing) {
          		console.log("parsed enums for field " + parsedField.className, parsedField);
          	}
  		}

  		if (field.javaFields && field.javaFields.javaField && field.javaFields.javaField.length) {
	  		for (let childField of field.javaFields.javaField) {
	  			var parsedChild: Field = this.parseFieldFromDocument(childField, docDef);
	  			if (parsedChild != null) {
	  				parsedField.children.push(parsedChild);
	  			}
	  		}
  		}	

  		return parsedField;
	}

	private handleError(message:string, error: any): void {
		this.cfg.errorService.error(message, error);
	}	
}