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
  selector: 'toolbar',
  template: `
    <div class="row toolbar-pf" style="padding-top:0px;">
      <div class="col-sm-12">
          <!--  
          <div class="form-group" style="padding-left:0px; padding-bottom:10px;">
            <button class="btn btn-default" type="button" (click)="buttonClicked('add');"><i class="fa fa-plus"></i> Add Mapping</button>
          </div>    
                
          <div class="form-group toolbar-pf-filter" style="border-right:0px solid black; padding-left:20px;">
            <label class="sr-only" for="filter">Name</label>
            <div class="input-group">
              <div class="input-group-btn">
                <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Name <span class="caret"></span></button>
                <ul class="dropdown-menu">
                  <li class="selected"><a href="#">Name</a></li>
                  <li><a href="#">Type</a></li>
                  <li><a href="#">Color</a></li>
                </ul>
              </div>
              <input type="text" class="form-control" id="filter" placeholder="Filter By Name...">
            </div>
          </div>
          -->
          <div class="toolbar-pf-action-right">
            <!--
            <div class="form-group">
              <label>Alerts</label><div style="display:inline; margin-left:10px; margin-right:0px; color:white; background-color:#888888; padding:1px 10px;">3</div>
            </div>
            -->
            <div class="form-group toolbar-pf-view-selector">
              <button class="btn btn-link " style="margin-top:-8px;" *ngIf="!cfg.showLinesAlways"
                (click)="buttonClicked('showLines');"><i class="fa fa-share-alt"></i></button>
              <button class="btn btn-link " style="margin-top:-8px; color:#0088ce;" *ngIf="cfg.showLinesAlways"
                (click)="buttonClicked('showLines');"><i class="fa fa-share-alt"></i></button>
              <button class="btn btn-link " style="margin-top:-8px;" *ngIf="!cfg.showMappingDetailTray"
                (click)="buttonClicked('showDetails');"><i class="fa fa-exchange"></i></button>
              <button class="btn btn-link " style="margin-top:-8px; color:#0088ce;" *ngIf="cfg.showMappingDetailTray"
                (click)="buttonClicked('showDetails');"><i class="fa fa-exchange"></i></button>
            </div>
          </div> 
      </div>
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

