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

import { Component, OnInit, Input, ViewChild, ViewChildren, DoCheck, QueryList,
	ViewContainerRef, Directive, Type, ComponentFactoryResolver, AfterViewInit,
	SimpleChange, Inject} from '@angular/core';
import { DOCUMENT, DomSanitizer, SafeResourceUrl, SafeUrl, SafeStyle} from '@angular/platform-browser';

// source: http://www.w3schools.com/howto/howto_css_modals.asp

@Component({
	selector: 'modal-window',
	template: `
		<div id="modalWindow" class="modalWindow" *ngIf="visible" [attr.style]="modalStyle">			
			<div class="modal-content">				
				<div class="modal-header">
					<a (click)="closeClicked($event)"><span class='close'><i class="fa fa-close"></i></span></a>
					{{headerText}}
				</div>
				<div class="modal-body">
					<div class="modal-message" *ngIf="message">{{message}}</div>
					<template #dyn_target></template>
					<div class="modal-buttons">
						<a class='button' (click)="buttonClicked(false)"><i class="fa fa-close"></i></a>
						<a class='button' (click)="buttonClicked(true)"><i class="fa fa-check"></i></a>
					</div>
				</div>
				<div class="modal-footer"></div>
			</div>
		</div>
    `
})

export class ModalWindowComponent implements AfterViewInit {
	@Input() headerText: string = "";
	@Input() parentComponent: Component;
	@Input() nestedComponentType: Type<any>;
	@Input() nestedComponentInitializedCallback: Function;
	@Input() okButtonHandler: Function;
	@Input() cancelButtonHandler: Function;

	public message: string = null;
	public nestedComponent: Component;

	private componentLoaded: boolean = false;
	private modalStyle: SafeStyle;
	public visible: boolean = false;

	@ViewChildren('dyn_target', {read: ViewContainerRef}) myTarget: QueryList<ViewContainerRef>;

	constructor(private componentFactoryResolver: ComponentFactoryResolver,
		@Inject(DOCUMENT) private document: any, private sanitizer: DomSanitizer) { }

	ngAfterViewInit() {
		//from: http://stackoverflow.com/questions/40811809/add-component-dynamically-inside-an-ngif
		this.myTarget.changes.subscribe(changes => {
			if (!this.componentLoaded && this.visible && this.myTarget && (this.myTarget.toArray().length)) {
				//break us out of a change detection call stack with timeout so we can change data on created comp.
				setTimeout(()=> { this.loadComponent(); }, 1);
			}
  		});
	}

	public loadComponent(): void {
		var viewContainerRef: ViewContainerRef = this.myTarget.toArray()[0];
		viewContainerRef.clear();
	    let componentFactory = this.componentFactoryResolver.resolveComponentFactory(this.nestedComponentType);
	    this.nestedComponent = viewContainerRef.createComponent(componentFactory).instance;
	    this.nestedComponentInitializedCallback(this);
  	}

	public closeClicked(event: MouseEvent): void { this.buttonClicked(false); }
	public close(): void { this.visible = false; }
	public show(): void {
		let number = (this.document.body.scrollTop);
		this.modalStyle = this.sanitizer.bypassSecurityTrustStyle("top:" + number + "px;");
		this.visible = true;
	}

	private buttonClicked(okClicked: boolean): void {
		if (okClicked) {
			if (this.okButtonHandler) {
				this.okButtonHandler(this);
			}
		} else { // cancel clicked
			if (this.cancelButtonHandler) {
				this.cancelButtonHandler(this);
			}
		}
		this.close();
	}

	public reset(): void {
		this.message = "";
		this.headerText = "";
		this.parentComponent = null;
		this.componentLoaded = false;
		this.nestedComponentType = null;
		this.okButtonHandler = null;
		this.cancelButtonHandler = null;
	}
}
