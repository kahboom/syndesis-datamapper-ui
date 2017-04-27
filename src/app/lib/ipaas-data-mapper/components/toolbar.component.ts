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

import { ConfigModel } from '../models/config.model';
import { MappingModel } from '../models/mapping.model';

import { LineMachineComponent } from './line.machine.component';

@Component({
  selector: 'dm-toolbar',
  template: `
    <div class="dm-toolbar">          
      <div class="dm-toolbar-icons" style="float:right;">
          <i class="fa fa-share-alt link" *ngIf="!cfg.showLinesAlways" (click)="toolbarButtonClicked('showLines');"></i>
          <i class="fa fa-share-alt link selected" *ngIf="cfg.showLinesAlways"(click)="toolbarButtonClicked('showLines');"></i>
          <i class="fa fa-exchange link" *ngIf="!cfg.showMappingDetailTray" (click)="toolbarButtonClicked('showDetails');"></i>
          <i class="fa fa-exchange link selected" *ngIf="cfg.showMappingDetailTray" (click)="toolbarButtonClicked('showDetails');"></i>
      </div>
      <div style="clear:both; height:0px;"></div>
    </div>
  `
})

export class ToolbarComponent { 
  @Input() cfg: ConfigModel;  
  @Input() lineMachine: LineMachineComponent;

  public toolbarButtonClicked(action: string, component: ToolbarComponent): void {
    if ("showDetails" == action) {
      if (this.cfg.mappings.activeMapping == null) {
        console.log("Creating new mapping.")        
        this.cfg.mappingService.selectMapping(new MappingModel());
      } else {
        this.cfg.mappingService.deselectMapping();
      }
    } else if ("showLines" == action) {
      this.cfg.showLinesAlways = !self.cfg.showLinesAlways;
      this.lineMachine.redrawLinesForMappings();
    }
  }
}

