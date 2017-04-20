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

import { Component, OnInit, Input, ViewChild, Injectable, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';

import { Field } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { MappingModel } from '../models/mapping.model';
import { TransitionModel, TransitionMode, TransitionDelimiter } from '../models/transition.model';
import { MappingDefinition } from '../models/mapping.definition.model';
import { ConfigModel } from '../models/config.model';

import { MappingManagementService } from '../services/mapping.management.service';
import { DocumentManagementService } from '../services/document.management.service';
import { ErrorHandlerService } from '../services/error.handler.service';

import { DocumentDefinitionComponent } from './document.definition.component';
import { MappingDetailComponent } from './mapping.detail.component';
import { ModalWindowComponent } from './modal.window.component';
import { DataMapperErrorComponent } from './data.mapper.error.component';
import { TransitionSelectionComponent } from './transition.selection.component';
import { LineMachineComponent } from './line.machine.component';
import { DocumentFieldDetailComponent } from './document.field.detail.component';
import { MappingSelectionComponent } from './mapping.selection.component';
import { ToolbarComponent } from './toolbar.component';

@Component({
	selector: 'data-mapper',
	moduleId: module.id, 
	encapsulation: ViewEncapsulation.None,
	templateUrl: './data.mapper.app.component.html',
	styleUrls: ['data.mapper.app.component.css']
})

export class DataMapperAppComponent implements OnInit {

	@Input() cfg:ConfigModel;

	@ViewChild('lineMachine')
  	public lineMachine: LineMachineComponent;

	@ViewChild('errorPanel')
  	public errorPanel: DataMapperErrorComponent;

  	@ViewChild('modalWindow')
  	public modalWindow: ModalWindowComponent;

	@ViewChild('docDefInput')
  	public docDefInput: DocumentDefinitionComponent;

  	@ViewChild('docDefOutput')
  	public docDefOutput: DocumentDefinitionComponent;

  	@ViewChild('mappingDetailComponent')
  	public mappingDetailComponent: MappingDetailComponent;

  	@ViewChild('toolbarComponent')
  	public toolbarComponent: ToolbarComponent;

  	public loadingStatus: string = "Loading."

  	constructor(public detector: ChangeDetectorRef) {}

	ngOnInit(): void {						
		this.cfg.mappingService.mappingSelectionRequired$.subscribe((mappings: MappingModel[]) => {
			this.selectMapping(mappings);
		});		

		this.cfg.initializationService.systemInitialized$.subscribe(() => {
			this.updateFromConfig();
			this.toolbarComponent.parentComponent = this;		
			this.mappingDetailComponent.modalWindow = this.modalWindow;		
		});	

		this.cfg.initializationService.initializationStatusChanged$.subscribe(() => {
			this.loadingStatus = this.cfg.initCfg.loadingStatus;
			setTimeout(() => { 
	        	this.detector.detectChanges();
	        }, 10);  			
		});			
	}        
	
	private selectMapping(mappingsForField: MappingModel[]): void {
		this.modalWindow.reset();
		this.modalWindow.confirmButtonText = "Select";
		this.modalWindow.parentComponent = this;
		this.modalWindow.headerText = "Select Mapping";
		this.modalWindow.nestedComponentInitializedCallback = (mw: ModalWindowComponent) => {
			var self: DataMapperAppComponent = mw.parentComponent as DataMapperAppComponent;
			var c: MappingSelectionComponent = mw.nestedComponent as MappingSelectionComponent;
			for (let d of self.cfg.getAllDocs()) {
				var selectedFields: Field[] = d.getSelectedFields();
				if (selectedFields.length == 1) {
					c.selectedField = selectedFields[0];
					c.selectedFieldIsSource = d.isSource;
					break;
				}
			}
			c.cfg = self.cfg;
			c.mappings = mappingsForField;
			c.modalWindow = this.modalWindow;
		};
		this.modalWindow.nestedComponentType = MappingSelectionComponent;	
		this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
			var self: DataMapperAppComponent = mw.parentComponent as DataMapperAppComponent;
			var c: MappingSelectionComponent = mw.nestedComponent as MappingSelectionComponent;
			var mapping: MappingModel = c.getSelectedMapping();
			self.cfg.mappingService.selectMapping(mapping);
		};
		this.modalWindow.cancelButtonHandler = (mw: ModalWindowComponent) => {
			var self: DataMapperAppComponent = mw.parentComponent as DataMapperAppComponent;	
			self.cfg.mappingService.selectMapping(null);
		};
		this.modalWindow.show();
	}	

	public updateFromConfig(): void {
		// update the mapping line drawing after our fields have redrawn themselves
        // without this, the x/y from the field dom elements is messed up / misaligned.
        setTimeout(()=> { this.lineMachine.redrawLinesForMappings(); }, 1);        
	}

	public buttonClickedHandler(action: string, component: ToolbarComponent): void {
		var self = component.parentComponent as DataMapperAppComponent;
		if ("showDetails" == action) {
			if (self.cfg.mappings.activeMapping == null) {
				console.log("Creating new mapping.")				
				self.cfg.mappingService.selectMapping(new MappingModel());
			}
			self.cfg.showMappingDetailTray = !self.cfg.showMappingDetailTray;
		} else if ("showLines" == action) {
			self.cfg.showLinesAlways = !self.cfg.showLinesAlways;
			self.lineMachine.redrawLinesForMappings();
		}
	}
}
