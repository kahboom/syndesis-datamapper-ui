import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hello',
  templateUrl: './hello.component.html',
  styleUrls: ['./hello.component.css']
})
export class HelloComponent implements OnInit {

  public world = "World!";

  constructor() { 
    console.log("Hello world!");
  }

  ngOnInit() {

  }
}
