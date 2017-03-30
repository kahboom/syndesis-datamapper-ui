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

import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl, SafeStyle} from '@angular/platform-browser';

import { ConfigModel } from '../models/config.model';
import { MappingModel } from '../models/mapping.model';
import { Field } from '../models/field.model';

import { MappingManagementService } from '../services/mapping.management.service';
import { DocumentManagementService } from '../services/document.management.service';

import { DocumentDefinitionComponent } from './document.definition.component';
import { DocumentFieldDetailComponent } from './document.field.detail.component';

export class LineModel {
	public sourceX: string;
	public sourceY: string;
	public targetX: string;
	public targetY: string;
	public color: string = "blue";
	public strokeWidth: string = "1";
	public style: SafeStyle;
}

@Component({
	selector: 'line-machine',
	template: `
		<div class="LineMachineComponent" #lineMachineElement on-mousemove="drawLine($event)" style="height:100%; margin-top:6%;">
			<svg style="width:100%; height:100%;">
				<svg:line *ngFor="let l of lines" 
					[attr.x1]="l.sourceX" [attr.y1]="l.sourceY" 
					[attr.x2]="l.targetX" [attr.y2]="l.targetY" 
					shape-rendering="optimizeQuality"
					[attr.style]="l.style"></svg:line>
				<svg:line *ngIf="lineBeingFormed && lineBeingFormed.targetY" 
					[attr.x1]="lineBeingFormed.sourceX" [attr.y1]="lineBeingFormed.sourceY" 
					[attr.x2]="lineBeingFormed.targetX" [attr.y2]="lineBeingFormed.targetY" 
					shape-rendering="optimizeQuality"
					[attr.style]="lineBeingFormed.style"></svg:line>
			</svg>
		</div>
	`
})

export class LineMachineComponent { 
	@Input() cfg: ConfigModel;
	@Input() docDefInput: DocumentDefinitionComponent;
	@Input() docDefOutput: DocumentDefinitionComponent;

	public lines: LineModel[] = [];
	public lineBeingFormed: LineModel;
	public drawingLine: boolean = false;
	public svgStyle: SafeStyle;	

	@ViewChild('lineMachineElement') lineMachineElement: ElementRef;

	constructor(private sanitizer: DomSanitizer) {}

	ngOnInit(): void {
		this.cfg.mappingService.activeMappingChanged$.subscribe((mappingIsNew: boolean) => {
			this.activeMappingChanged(mappingIsNew);
		});		
		this.cfg.mappingService.mappingUpdated$.subscribe(() => {
			this.activeMappingChanged(false);
		});				
	}

	public addLineFromParams(sourceX: string, sourceY: string, targetX: string, targetY: string, 
		color: string, strokeWidth: string): void {		
		var l: LineModel = new LineModel();
		l.sourceX = sourceX;
		l.sourceY = sourceY;
		l.targetX = targetX;
		l.targetY = targetY;
		l.color = color;
		l.strokeWidth = strokeWidth;
		this.addLine(l);
	}

	public addLine(l: LineModel): void {
		this.createLineStyle(l);
		this.lines.push(l);
	}

	private createLineStyle(l: LineModel): void {
		//angular2 will throw an error if we don't use this sanitizer to signal to angular2 that the css style value is ok.
		l.style = this.sanitizer.bypassSecurityTrustStyle("stroke:" + l.color + "; stroke-width:" + l.strokeWidth + ";");
	}

	public setLineBeingFormed(l: LineModel): void {
		if (l != null) {
			this.createLineStyle(l);
		}
		this.lineBeingFormed = l;
	}

	public clearLines(): void {
		this.lines = [];
	}

	public drawLine(event: MouseEvent): void {
		this.drawCurrentLine(event.offsetX.toString(), event.offsetY.toString());
	}

	public drawCurrentLine(x: string, y: string): void {
		if (this.drawingLine && this.lineBeingFormed) {
			this.lineBeingFormed.targetX = x;
			this.lineBeingFormed.targetY = y;
		}
	}

	public handleDocumentFieldMouseOver(component: DocumentFieldDetailComponent, event: MouseEvent): void {		
		if (!this.drawingLine) {
			return;
		}
		var isOutput: boolean = (component.docDef.isSource == false);
		if (!isOutput) {
			return;
		}
		var targetY = this.docDefOutput.getFieldDetailComponentPosition(component.field.path).y;
		this.drawCurrentLine("100%", (targetY + 17).toString());
    }

	public activeMappingChanged(mappingIsNew: boolean): void {
		if (!mappingIsNew) {
			console.log("active line drawing turned off");
			this.drawingLine = false;
			this.setLineBeingFormed(null);		
		} else {
			var mapping: MappingModel = this.cfg.mappings.activeMapping;
			var inputSelected: boolean = (mapping.inputFieldPaths.length == 1);
			var outputSelected: boolean = (mapping.outputFieldPaths.length == 1);
			if ((inputSelected && !outputSelected) || (!inputSelected && outputSelected) ) {
				console.log("active line drawing turned on");				
				var l: LineModel = new LineModel();
				l.color = "#02A2D7";
				l.strokeWidth = "3";
				var pos: any = null;
				if (inputSelected) {
					var fieldPathToFind: string = this.cfg.mappings.activeMapping.inputFieldPaths[0];
					pos = this.docDefInput.getFieldDetailComponentPosition(fieldPathToFind);
					l.sourceX = "0";
				} else {
					var fieldPathToFind: string = this.cfg.mappings.activeMapping.outputFieldPaths[0];
					pos = this.docDefOutput.getFieldDetailComponentPosition(fieldPathToFind);
					l.sourceX = "100%";
				}	
				if (pos != null) {
					l.sourceY = (pos.y + 17).toString();							
					this.setLineBeingFormed(l);
					this.drawingLine = true;
				}				
			}
		}
				
		// update the mapping line drawing after our fields have redrawn themselves
        // without this, the x/y from the field dom elements is messed up / misaligned.
        setTimeout(() => { this.redrawLinesForMappings(); }, 1);  
	}

	public redrawLinesForMappings(): void {
		if (!this.cfg.mappings.activeMapping) {
			this.setLineBeingFormed(null);
		}
		this.clearLines();
		var mappings: MappingModel[] = this.cfg.mappings.mappings;
		var activeMapping: MappingModel = this.cfg.mappings.activeMapping;
		var foundSelectedMapping: boolean = false;
		for (let m of mappings) {
			foundSelectedMapping = foundSelectedMapping || (m == activeMapping);
			this.drawLinesForMapping(m);
		}			
		if (!foundSelectedMapping && activeMapping) {
			this.drawLinesForMapping(activeMapping);
		}
	}

	private drawLinesForMapping(m: MappingModel): void {
		var el: any = this.lineMachineElement.nativeElement;
		var lineMachineHeight: number = el.offsetHeight;
		if (m.inputFieldPaths.length && m.outputFieldPaths.length) {
			//don't draw mapping for this mapping if any of the fields aren't visible
			for (let inputFieldPath of m.inputFieldPaths) {
				var inputField: Field = this.cfg.sourceDocs[0].getField(inputFieldPath);
				if (!inputField) {
					console.error("Can't find input field, not drawing line: " + inputFieldPath);
					return;
				}
				if (!inputField.visible) {
					return;
				}
			}

			for (let outputFieldPath of m.outputFieldPaths) {
				var outputField: Field = this.cfg.targetDocs[0].getField(outputFieldPath);
				if (!outputField) {
					console.error("Can't find output field, not drawing line: " + outputFieldPath);
					return;
				}
				if (!outputField.visible) {
					return;
				}
			}

			//draw lines for the given mapping
			for (let inputFieldPath of m.inputFieldPaths) {
				for (let outputFieldPath of m.outputFieldPaths) {
					var pos: any = this.docDefInput.getFieldDetailComponentPosition(inputFieldPath);
					if (pos == null) {
						continue;
					}
					var sourceY: number = pos.y;
					pos = this.docDefOutput.getFieldDetailComponentPosition(outputFieldPath);
					if (pos == null) {
						continue;
					}
					var targetY: number = pos.y;
					if ((sourceY < 18) || (targetY < 18) || (sourceY > (lineMachineHeight - 58))
						|| (targetY > (lineMachineHeight - 58))) {
						continue;
					}
					var isSelectedMapping: boolean = (this.cfg.mappings.activeMapping == m);
					var color: string = isSelectedMapping ? "#02A2D7" : "#A2A2A2";
					var strokeWidth: string = isSelectedMapping ? "3" : "1";
					if (this.cfg.showLinesAlways || isSelectedMapping) {
						this.addLineFromParams("0", (sourceY + 17).toString(), 
							"100%", (targetY + 17).toString(), color, strokeWidth);	
					}
				}
			}			
		}
	}
}