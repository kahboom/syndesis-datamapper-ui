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

import { Component, Input } from '@angular/core';

import { TransitionModel, TransitionMode, TransitionDelimiter } from '../models/transition.model';
import { ConfigModel } from '../models/config.model';
import { Field, EnumValue } from '../models/field.model';
import { LookupTable, LookupTableEntry } from '../models/lookup.table.model';

import { ModalWindowComponent } from './modal.window.component';
import { LookupTableComponent } from './lookup.table.component';

@Component({
	selector: 'transition-selector',
	template: `
		<div class="mappingFieldContainer TransitionSelector">
			<div class="MappingFieldSection" *ngIf="cfg.mappings.activeMapping">
				<div *ngIf="modeIsEnum()">
					<label>{{ getMappedValueCount() }} values mapped</label>
					<a (click)="showLookupTable()"><i class="fa fa-edit"></i></a>
				</div>
				<div *ngIf="!modeIsEnum()">					
					<label>Action</label>
					<select (change)="selectionChanged($event);" selector="mode" 
						[ngModel]="cfg.mappings.activeMapping.transition.mode">
						<option value="{{modes.MAP}}">Map</option>
						<option value="{{modes.SEPARATE}}">Separate</option>
					</select>
				</div>
				<div *ngIf="cfg.mappings.activeMapping.transition.mode == modes.SEPARATE" style="margin-top:10px;">
					<label>Separator:</label>
					<select (change)="selectionChanged($event);" selector="separator" 
						[ngModel]="cfg.mappings.activeMapping.transition.delimiter">
						<option value="{{delimeters.SPACE}}">Space</option>
						<option value="{{delimeters.COMMA}}">Comma</option>
					</select>
				</div>
			</div>
		</div>
	`
})

export class TransitionSelectionComponent {
	@Input() cfg: ConfigModel;
	@Input() modalWindow: ModalWindowComponent;

	private modes: any = TransitionMode;
	private delimeters: any = TransitionDelimiter;	

	private modeIsEnum(): boolean {
		return this.cfg.mappings.activeMapping.transition.mode == TransitionMode.ENUM;
	}

	private getMappedValueCount(): number {
		var tableName: string = this.cfg.mappings.activeMapping.transition.lookupTableName;
		if (tableName == null) {
			return 0;
		}
		var table: LookupTable = this.cfg.mappings.getTableByName(tableName);
		if (!table || !table.entries) {
			return 0;
		}
		return table.entries.length;
	}

	selectionChanged(event: MouseEvent) {
		var eventTarget: any = event.target; //extract this to avoid compiler error about 'selectedOptions' not existing.	
		var selectorIsMode: boolean = "mode" == eventTarget.attributes.getNamedItem("selector").value
		var selectedValue: any = eventTarget.selectedOptions.item(0).attributes.getNamedItem("value").value;
		if (selectorIsMode) {
			this.cfg.mappings.activeMapping.transition.mode = parseInt(selectedValue);
		} else {
			this.cfg.mappings.activeMapping.transition.delimiter = parseInt(selectedValue);
		}	
		this.cfg.mappings.activeMapping.updateSeparatorIndexes();	
		this.cfg.mappingService.saveCurrentMapping();
	}

	private showLookupTable() {
		if (!this.cfg.mappings.activeMapping.inputFieldPaths.length 
			|| !this.cfg.mappings.activeMapping.outputFieldPaths.length) {
			this.cfg.errorService.warn("Please select source and target fields before mapping values.", null);
			return;
		}
		this.modalWindow.reset();
		this.modalWindow.parentComponent = this;
		this.modalWindow.headerText = "Map Enumeration Values";
		this.modalWindow.nestedComponentInitializedCallback = (mw: ModalWindowComponent) => {
			var self: TransitionSelectionComponent = mw.parentComponent as TransitionSelectionComponent;
			var c: LookupTableComponent = mw.nestedComponent as LookupTableComponent;		
			c.initialize(self.cfg);
		};
		this.modalWindow.nestedComponentType = LookupTableComponent;	
		this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
			var self: TransitionSelectionComponent = mw.parentComponent as TransitionSelectionComponent;
			var c: LookupTableComponent = mw.nestedComponent as LookupTableComponent;
			c.saveTable();
			self.cfg.mappingService.saveCurrentMapping();
		};
		this.modalWindow.show();
	}
}