import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-example',
  template: require('./example.component.html'),
  styles: [require('./example.component.css')]
})
export class ExampleComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
