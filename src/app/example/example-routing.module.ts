import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ExampleComponent } from './example.component';

@NgModule({
  imports: [RouterModule.forChild([
    { path: '', component: ExampleComponent, pathMatch: 'full' }
  ])],
  exports: [RouterModule],
  providers: []
})
export class ExampleRoutingModule { }
