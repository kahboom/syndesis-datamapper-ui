import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExampleComponent } from './example.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    ExampleComponent
  ],
  exports: [
    ExampleComponent
  ]
})
export class ExampleModule { }
