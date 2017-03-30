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

import { Component, ViewChild } from '@angular/core';

import { DocumentDefinition } from '../models/document.definition.model';
import { MappingDefinition } from '../models/mapping.definition.model';
import { ConfigModel } from '../models/config.model';
import { MappingModel } from '../models/mapping.model';

import { ErrorHandlerService } from '../services/error.handler.service';
import { DocumentManagementService } from '../services/document.management.service';
import { MappingManagementService } from '../services/mapping.management.service';
import { InitializationService } from '../services/initialization.service';

import { DataMapperAppComponent } from './data.mapper.app.component';

@Component({
  selector: 'data-mapper-example-host',
  template: `
  	<data-mapper #dataMapperComponent [cfg]="cfg"></data-mapper>
  `,
  providers: [MappingManagementService, ErrorHandlerService, DocumentManagementService]
})

export class DataMapperAppExampleHostComponent {

	@ViewChild('dataMapperComponent')
  	public dataMapperComponent: DataMapperAppComponent;
  	
  	public cfg: ConfigModel;

  	constructor(private initializationService: InitializationService,
  		private documentService: DocumentManagementService, 
  		private mappingService: MappingManagementService, 
		private errorService: ErrorHandlerService) { 

		// initialize config information before initializing services
		var c: ConfigModel = new ConfigModel();

		//store references to our services in our config model
		c.documentService = documentService;
		c.mappingService = mappingService;
		c.errorService = errorService;
		c.initializationService = initializationService;

		//initialize base urls for our service calls
		c.baseJavaServiceUrl = "http://localhost:8585/v2/atlas/java/";
		c.baseMappingServiceUrl = "http://localhost:8585/v2/atlas/";

		//initialize data for our class path service call
		//note that quotes, newlines, and tabs are escaped
		c.pomPayload = DataMapperAppExampleHostComponent.createExamplePom();
		c.classPathFetchTimeoutInMilliseconds = 30000;
		// if classPath is specified, maven call to resolve pom will be skipped
		c.classPath = null;
		
		//specify source/target documents
		var docDef: DocumentDefinition = new DocumentDefinition();
		docDef.isSource = true;
		docDef.initCfg.documentIdentifier = "twitter4j.Status";
		c.sourceDocs.push(docDef);
		docDef = new DocumentDefinition();
		docDef.isSource = false;
		docDef.initCfg.documentIdentifier = "org.apache.camel.salesforce.dto.Contact";
		c.targetDocs.push(docDef);

		// point services' config pointers to our config
		c.documentService.cfg = c;
		c.mappingService.cfg = c;
		c.initializationService.cfg = c;		
		
		//if you'd like to load our mappings from JSON (rather than mapping service files), turn this on
		var loadMappingsFromJSON: boolean = true;
		if (loadMappingsFromJSON) {
			var mappingDefinition: MappingDefinition = new MappingDefinition();
			var mappingJSON: any = DataMapperAppExampleHostComponent.createExampleMappingsJSON();
			c.mappingService.deserializeMappingServiceJSON(mappingJSON, mappingDefinition);
			c.mappings = mappingDefinition;
			console.log("Example JSON used for mapping definition loading.", mappingJSON);
			console.log("Loaded mapping definition from example JSON", mappingDefinition);
		}

		console.log("Example config.", c);

		this.cfg = c;

		
			
		//initialize system
		c.initializationService.initialize();

		//save the mappings when the ui calls us back asking for save
		c.mappingService.saveMappingOutput$.subscribe((saveHandler: Function) => {
			//NOTE: the mapping definition being saved is currently stored in "this.cfg.mappings" until further notice.

			console.log("Host component saving mappings.");
			console.log("Mappings to save.", this.cfg.mappings);
			
			//turn this on to print out example json
			var makeExampleJSON: boolean = true;
			if (makeExampleJSON) {
				var jsonObject: any = c.mappingService.serializeMappingsToJSON(this.cfg.mappings);			
				var jsonVersion = JSON.stringify(jsonObject);
				var jsonPretty = JSON.stringify(JSON.parse(jsonVersion),null,2); 
				console.log("Mappings as JSON: " + jsonPretty);
			}

			c.mappingService.saveMappingToService(saveHandler);
		});		
	}  	

	public static createExamplePom(): string {
		var pom: string = `		
			<project xmlns="http://maven.apache.org/POM/4.0.0" 
				xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
				xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">

				<modelVersion>4.0.0</modelVersion>
				<groupId>foo.bar</groupId>
				<artifactId>test.model</artifactId>
				<version>1.10.0</version>
				<packaging>jar</packaging>
				<name>Test :: Model</name>

				<dependencies>
					<dependency>
						<groupId>com.fasterxml.jackson.core</groupId>
						<artifactId>jackson-annotations</artifactId>
						<version>2.8.5</version>
					</dependency>
					<dependency>
						<groupId>com.fasterxml.jackson.core</groupId>
						<artifactId>jackson-databind</artifactId>
						<version>2.8.5</version>
					</dependency>
					<dependency>
						<groupId>com.fasterxml.jackson.core</groupId>
						<artifactId>jackson-core</artifactId>
						<version>2.8.5</version>
					</dependency>
				</dependencies>
			</project>
		`;
		
		//pom = pom.replace(/\"/g, "\\\"");
		/*
		pom = pom.replace(/\n/g, "\\n");
		pom = pom.replace(/\t/g, "\\t");
		*/
		return pom;
	}

	public static createExampleMappingsJSON(): any {
		var json: any = {
			"AtlasMapping": {
				"jsonType": "com.mediadriver.atlas.v2.AtlasMapping",
				"fieldMappings": {
					"fieldMapping": [
						{
							"jsonType": "com.mediadriver.atlas.v2.MapFieldMapping",
							"inputField": {
								"jsonType": "com.mediadriver.atlas.v2.MappedField",
								"field": {
									"jsonType": "com.mediadriver.atlas.java.v2.JavaField",
									"status": "SUPPORTED",
									"modifiers": { "modifier": [] },
									"name": "text",
									"className": "java.lang.String",
									"type": "STRING",
									"getMethod": "getText",
									"primitive": true,
									"array": false,
									"synthetic": false,
									"path": "Text"
								},
								"fieldActions": null
							},
							"outputField": {
								"jsonType": "com.mediadriver.atlas.v2.MappedField",
								"field": {
									"jsonType": "com.mediadriver.atlas.java.v2.JavaField",
									"status": "SUPPORTED",
									"modifiers": { "modifier": [ "PRIVATE" ] },
									"name": "Description",
									"className": "java.lang.String",
									"type": "STRING",
									"getMethod": "getDescription",
									"setMethod": "setDescription",
									"primitive": true,
									"array": false,
									"synthetic": false,
									"path": "Description"
								},
								"fieldActions": null
							}
						},
						{
							"jsonType": "com.mediadriver.atlas.v2.SeparateFieldMapping",
							"inputField": {
								"jsonType": "com.mediadriver.atlas.v2.MappedField",
								"field": {
									"jsonType": "com.mediadriver.atlas.java.v2.JavaField",
									"status": "SUPPORTED",
									"modifiers": { "modifier": [] },
									"name": "name",
									"className": "java.lang.String",
									"type": "STRING",
									"getMethod": "getName",
									"primitive": true,
									"array": false,
									"synthetic": false,
									"path": "User.Name"
								},
								"fieldActions": null
							},
							"outputFields": {
								"mappedField": [
									{
										"jsonType": "com.mediadriver.atlas.v2.MappedField",
										"field": {
											"jsonType": "com.mediadriver.atlas.java.v2.JavaField",
											"status": "SUPPORTED",
											"modifiers": { "modifier": [ "PRIVATE" ] },
											"name": "FirstName",
											"className": "java.lang.String",
											"type": "STRING",
											"getMethod": "getFirstName",
											"setMethod": "setFirstName",
											"primitive": true,
											"array": false,
											"synthetic": false,
											"path": "FirstName"
										},
										"fieldActions": {
											"fieldAction": [ { "jsonType": "com.mediadriver.atlas.v2.MapAction", "index": 0 } ]
										}
									},
									{
										"jsonType": "com.mediadriver.atlas.v2.MappedField",
										"field": {
											"jsonType": "com.mediadriver.atlas.java.v2.JavaField",
											"status": "SUPPORTED",
											"modifiers": {
											"modifier": [ "PRIVATE" ] },
											"name": "LastName",
											"className": "java.lang.String",
											"type": "STRING",
											"getMethod": "getLastName",
											"setMethod": "setLastName",
											"primitive": true,
											"array": false,
											"synthetic": false,
											"path": "LastName"
										},
										"fieldActions": {
											"fieldAction": [ { "jsonType": "com.mediadriver.atlas.v2.MapAction", "index": 1 }]
										}
									}
								]
							},
							"strategy": "SPACE"
						},
						{
							"jsonType": "com.mediadriver.atlas.v2.MapFieldMapping",
							"inputField": {
								"jsonType": "com.mediadriver.atlas.v2.MappedField",
								"field": {
									"jsonType": "com.mediadriver.atlas.java.v2.JavaField",
									"status": "SUPPORTED",
									"modifiers": { "modifier": [] },
									"name": "screenName",
									"className": "java.lang.String",
									"type": "STRING",
									"getMethod": "getScreenName",
									"primitive": true,
									"array": false,
									"synthetic": false,
									"path": "User.ScreenName"
								},
								"fieldActions": null
							},
							"outputField": {
								"jsonType": "com.mediadriver.atlas.v2.MappedField",
								"field": {
									"jsonType": "com.mediadriver.atlas.java.v2.JavaField",
									"status": "SUPPORTED",
									"modifiers": {
									"modifier": [ "PRIVATE" ] },
									"name": "Title",
									"className": "java.lang.String",
									"type": "STRING",
									"getMethod": "getTitle",
									"setMethod": "setTitle",
									"primitive": true,
									"array": false,
									"synthetic": false,
									"path": "Title"
								},
								"fieldActions": null
							}
						}
					]
				},
				"name": "UI.867332",
				"sourceUri": "atlas:java?className=twitter4j.Status",
				"targetUri": "atlas:java?className=org.apache.camel.salesforce.dto.Contact",
				"lookupTables": { "lookupTable": [] }
			}
		}	
		return json;
	}
}
