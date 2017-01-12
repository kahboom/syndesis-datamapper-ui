import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-test',
  template: require('./test.component.html'),
  styleUrls: [require('./test.component.css')]
})
export class TestComponent implements OnInit {

  public world = "World!";

  constructor() { 
    console.log("Hello world!");
  }

  ngOnInit() {

  }
}
