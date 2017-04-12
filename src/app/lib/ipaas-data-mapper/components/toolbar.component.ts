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

@Component({
  selector: 'dm-toolbar',
  template: `
    <div class="dm-toolbar">          
      <div class="dm-toolbar-icons" style="float:right;">
          <button class="btn btn-link" (click)="buttonClicked('showLines');">
            <i class="fa fa-share-alt" *ngIf="!cfg.showLinesAlways" ></i>
            <i class="fa fa-share-alt" style="color:#0088ce;" *ngIf="cfg.showLinesAlways"></i>
          </button>
          <button class="btn btn-link" (click)="buttonClicked('showDetails');">
            <i class="fa fa-exchange" *ngIf="!cfg.showMappingDetailTray" ></i>
            <i class="fa fa-exchange" style="color:#0088ce;" *ngIf="cfg.showMappingDetailTray"></i>
          </button>
      </div>
      <div style="clear:both; height:0px;"></div>
    </div>
  `
})

export class ToolbarComponent { 
  @Input() buttonClickedHandler: Function;
  @Input() parentComponent: Component;
  @Input() cfg: ConfigModel;
  
  buttonClicked(action: string) {
    this.buttonClickedHandler(action, this);
  }
}

