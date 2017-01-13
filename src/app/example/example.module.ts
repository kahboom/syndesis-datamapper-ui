import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { ExampleRoutingModule } from './example-routing.module';

import { ExampleComponent } from './example.component';
import { HelloComponent } from './hello/hello.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpModule,
    ExampleRoutingModule
  ],
  exports: [
    ExampleRoutingModule,
    ExampleComponent,
    HelloComponent
  ],
  declarations: [ 
    ExampleComponent,
    HelloComponent
  ]
})
export class ExampleModule { }
