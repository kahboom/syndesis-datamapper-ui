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

  	constructor(private documentService: DocumentManagementService,
  		private mappingService: MappingManagementService,
		private errorService: ErrorHandlerService) {

		// initialize config information before initializing services
		var c: ConfigModel = new ConfigModel();

		//provide the urls for the inspection mapping services
		c.baseJavaServiceUrl = "http://localhost:8585/v2/atlas/java/";
		c.baseMappingServiceUrl = "http://localhost:8585/v2/atlas/";

		//provide source/target classes
		c.mappingInputJavaClass = "twitter4j.Status";
		c.mappingOutputJavaClass = "org.apache.camel.salesforce.dto.Contact";

		//create empty mapping data
		c.mappings = new MappingDefinition();

		//put pointers to our services in our shared config
		c.documentService = documentService;
		c.mappingService = mappingService;
		c.errorService = errorService;
		this.cfg = c;

		// point services' config pointers to our config
		c.documentService.cfg = c;
		c.mappingService.cfg = c;

		// fetch the input / output documents from the inspection service
		c.documentService.initialize();

		// fetch mappings from the mapping service
		// (currently hard coded to look up and use first mapping config prefixed with "UI")
		c.mappingService.initialize();

		//save the mappings when the ui calls us back asking for save
		c.mappingService.saveMappingOutput$.subscribe((saveHandler: Function) => {
			console.log("Host component saving mappings.");
			c.mappingService.saveMappingToService(saveHandler);
		});
	}
}
