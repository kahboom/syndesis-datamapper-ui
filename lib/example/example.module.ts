import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ExampleComponent } from './example.component';

@NgModule({
  imports: [
    CommonModule,
    NgbModule
  ],
  declarations: [
    ExampleComponent
  ],
  exports: [
    ExampleComponent
  ]
})
export class ExampleModule { }
