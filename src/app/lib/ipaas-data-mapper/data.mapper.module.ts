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

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { TypeaheadModule } from 'ng2-bootstrap';

import { DocumentManagementService } from './services/document.management.service';
import { MappingManagementService } from './services/mapping.management.service';
import { ErrorHandlerService } from './services/error.handler.service';
import { InitializationService } from './services/initialization.service';

import { ModalWindowComponent } from './components/modal.window.component';
import { TransitionSelectionComponent } from './components/transition.selection.component';
import { LookupTableComponent } from './components/lookup.table.component';
import { DataMapperErrorComponent } from './components/data.mapper.error.component';

import { DocumentFieldDetailComponent } from './components/document.field.detail.component';
import { DocumentDefinitionComponent } from './components/document.definition.component';

import { MappingFieldDetailComponent } from './components/mapping.field.detail.component';
import { MappingFieldActionComponent } from './components/mapping.field.action.component';
import { MappingDetailComponent, MappingDetailHeaderComponent, 
	MappingFieldSectionComponent } from './components/mapping.detail.component';
import { MappingSelectionComponent, MappingSelectionSectionComponent } from './components/mapping.selection.component';

import { DataMapperAppComponent } from './components/data.mapper.app.component';
import { DataMapperAppExampleHostComponent } from './components/data.mapper.example.host.component';

import { LineMachineComponent } from './components/line.machine.component';
import { ToolbarComponent } from './components/toolbar.component';

// export services/types for consumers of this module
export { ErrorHandlerService } from './services/error.handler.service';
export { DocumentManagementService } from './services/document.management.service';
export { MappingManagementService } from './services/mapping.management.service';
export { InitializationService } from './services/initialization.service';
export { DocumentDefinition } from './models/document.definition.model';
export { MappingDefinition } from './models/mapping.definition.model';
export { ConfigModel } from './models/config.model';
export { MappingModel } from './models/mapping.model';

export { DataMapperAppComponent } from './components/data.mapper.app.component';


@NgModule({
	imports: [ 
		CommonModule, 
		HttpModule, 
		FormsModule, 
		TypeaheadModule.forRoot()
	],
	declarations: [
		DataMapperAppComponent,
		DocumentDefinitionComponent,
		MappingDetailComponent,
		MappingDetailHeaderComponent,
		MappingFieldSectionComponent,
		ModalWindowComponent,
		DataMapperAppExampleHostComponent,
		MappingFieldActionComponent,
		MappingFieldDetailComponent,
		DocumentFieldDetailComponent,
		DataMapperErrorComponent,
		TransitionSelectionComponent,
		LineMachineComponent,
		MappingSelectionComponent,
		MappingSelectionSectionComponent,
		ToolbarComponent,
		LookupTableComponent
	],
	exports: [
		DataMapperAppExampleHostComponent,
		ModalWindowComponent,
		DataMapperAppComponent,
	],
	providers: [
		DocumentManagementService,
		MappingManagementService,
		ErrorHandlerService,
		InitializationService
	],
	entryComponents: [
		TransitionSelectionComponent,
		MappingSelectionComponent,
		LookupTableComponent
	],
 	bootstrap: [ DataMapperAppExampleHostComponent ]
})
export class DataMapperModule { }
