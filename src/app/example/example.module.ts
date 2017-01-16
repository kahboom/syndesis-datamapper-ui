import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExampleRoutingModule } from './example-routing.module';

import { ExampleComponent } from './example.component';
import { HelloComponent } from './hello/hello.component';

@NgModule({
  imports: [
    CommonModule,
    ExampleRoutingModule
  ],
  exports: [
    ExampleComponent,
    HelloComponent,
    ExampleRoutingModule
  ],
  declarations: [ 
    ExampleComponent,
    HelloComponent
  ]
})
export class ExampleModule {

}
