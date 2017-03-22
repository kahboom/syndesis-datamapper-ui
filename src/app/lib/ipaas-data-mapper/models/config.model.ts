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

import { MappingDefinition } from './mapping.definition.model';
import { DocumentDefinition } from './document.definition.model';

import { ErrorHandlerService } from '../services/error.handler.service';
import { DocumentManagementService } from '../services/document.management.service';
import { MappingManagementService } from '../services/mapping.management.service';

export class ConfigModel {
	public baseJavaServiceUrl: string;
	public baseMappingServiceUrl: string;
	public mappingInputJavaClass: string;
	public mappingOutputJavaClass: string;

	public showMappingDetailTray: boolean = false;
	public showMappingDataType: boolean = false;
	public showLinesAlways: boolean = false;

	public documentService: DocumentManagementService;
	public mappingService: MappingManagementService;
	public errorService: ErrorHandlerService;	

	public inputDoc: DocumentDefinition;
	public outputDoc: DocumentDefinition;

	public mappings: MappingDefinition = new MappingDefinition();
}