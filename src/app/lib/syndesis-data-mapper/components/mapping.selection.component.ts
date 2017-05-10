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

import { Component, Input, ViewChildren, ElementRef, QueryList, } from '@angular/core';

import { MappingModel } from '../models/mapping.model';
import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';

import { ModalWindowComponent } from './modal.window.component';

@Component({
	selector: 'mapping-selection-section',
	template: `
		<div [attr.class]="getClass()" (click)="handleMouseClick($event)">			
			<div class="numberWrapper"><div class="number">{{ outputNumber + 1 }}</div></div>
			<div class="pathContainer" *ngFor="let path of getPaths()">
				<div class="path">{{ getFormattedOutputPath(path, false) }}</div>
				<div class="fieldName">{{ getFormattedOutputPath(path, true) }}</div>
				<div class="clear"></div>
			</div>
			<div style="clear:both; height:0px;"></div>
		</div>
	`
})

export class MappingSelectionSectionComponent {
	@Input() outputNumber: number;
	@Input() mapping: MappingModel;
	@Input() selectedCallback: Function;
	@Input() selected: boolean = false;
	@Input() selectedFieldIsSource: boolean = false;
	@Input() parentComponent: Component;

	public getClass(): string {
		return "MappingSelectionSection" + (this.selected ? " SelectedMappingSelectionSection" : "");
	}

	public getPaths(): string[] {
		return this.selectedFieldIsSource ? this.mapping.outputFieldPaths : this.mapping.inputFieldPaths;
	}

	public getFormattedOutputPath(path: string, nameOnly:boolean) {
		path = path.replace(".", "/");
		var index: number = path.lastIndexOf("/");
		var fieldName: string = (index == -1) ? path : path.substr(path.lastIndexOf("/") + 1);
		path = (index == -1) ? "" : path.substr(0, path.lastIndexOf("/") + 1)		
		return nameOnly ? fieldName: path;
	}
	
	public handleMouseClick(event: MouseEvent) {
		this.selectedCallback(this);
	}
}

@Component({
	selector: 'mapping-selection',
	template: `
		<div class="MappingSelectionComponent" *ngIf="mappings">
			<div class="header">
				<div class="sourceTargetHeader">{{ selectedFieldIsSource ? 'Source' : 'Target' }}</div>
				<div class="pathHeader">
					<div class="path">{{ getFormattedOutputPath(selectedField.path, false) }}</div>
					<div class="fieldName">{{ getFormattedOutputPath(selectedField.path, true) }}</div>
					<div style="clear:both; height:0px;"></div>
				</div>
				<div style="clear:both; height:0px;"></div>
				<button class="btn btn-primary addButton" (click)="addMapping()">
					<i class="fa fa-plus"></i>Add New Mapping
				</button>
			</div>
			<mapping-selection-section *ngFor="let mapping of mappings; let i = index; let odd=odd; let even=even;"
				[mapping]="mapping" [outputNumber]="i" [selected]="i == 0" [selectedCallback]="selectionChanged" 
				[selectedFieldIsSource]="selectedFieldIsSource" [parentComponent]="this" #mappingSection>
			</mapping-selection-section>					
		</div>
	`
})

export class MappingSelectionComponent {
	public modalWindow: ModalWindowComponent;
	public mappings: MappingModel[];
	public selectedFieldIsSource: boolean = false;
	public selectedField: Field = null;
	public cfg: ConfigModel;
	private selectedMappingComponent: MappingSelectionSectionComponent = null;

	@ViewChildren('mappingSection') sectionComponents: QueryList<MappingSelectionSectionComponent>;    

	selectionChanged(c: MappingSelectionSectionComponent) {
		var self: MappingSelectionComponent = c.parentComponent as MappingSelectionComponent;
		console.log("c", c);
		console.log("self", self);
		var oldSelectedItem: MappingSelectionSectionComponent = self.getSelectedMappingComponent();
		oldSelectedItem.selected = false;
		c.selected = true;
		self.selectedMappingComponent = c;
	}

	public getFormattedOutputPath(path: string, nameOnly:boolean) {
		path = path.replace(".", "/");
		var index: number = path.lastIndexOf("/");
		var fieldName: string = (index == -1) ? path : path.substr(path.lastIndexOf("/") + 1);
		path = (index == -1) ? "" : path.substr(0, path.lastIndexOf("/") + 1)
		return nameOnly ? fieldName: path;
	}

	public addMapping() {
		console.log("Creating new mapping.")
		var m: MappingModel = new MappingModel();
		if (this.selectedFieldIsSource) {
			m.inputFieldPaths.push(this.selectedField.path);
		} else {
			m.outputFieldPaths.push(this.selectedField.path);
		}
		this.cfg.mappingService.selectMapping(m, true);
		this.modalWindow.close();
	}

	private getSelectedMappingComponent(): MappingSelectionSectionComponent {
		if (this.selectedMappingComponent == null) {
			for (let c of this.sectionComponents.toArray()) {
				if (c.selected) {
					this.selectedMappingComponent = c;
					break;
				}
			}
		}
		return this.selectedMappingComponent;
	}

	public getSelectedMapping(): MappingModel {
		return this.getSelectedMappingComponent().mapping;
	}
}