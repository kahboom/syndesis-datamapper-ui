import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hello',
  template: require('./hello.component.html'),
  styles: [require('./hello.component.css')]
})
export class HelloComponent implements OnInit {

  public world = "World!";

  constructor() { 
    console.log("Hello world!");
  }

  ngOnInit() {

  }
}
