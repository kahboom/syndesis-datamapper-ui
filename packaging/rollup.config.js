const packageJson = require('../package.json');

export default {
  entry: 'dist/index.js',
  dest: 'dist/' + packageJson.name + '.umd.js',
  sourceMap: false,
  format: 'umd',
  moduleName: 'ng.' + packageJson.name,
  globals: {
    '@angular/core': 'ng.core',
    '@angular/common': 'ng.common',
    '@angular/http': 'ng.http',
    '@angular/router': 'ng.router',
    'rxjs/Observable': 'Rx',
    'rxjs/ReplaySubject': 'Rx',
    'rxjs/add/operator/map': 'Rx.Observable.prototype',
    'rxjs/add/operator/mergeMap': 'Rx.Observable.prototype',
    'rxjs/add/observable/fromEvent': 'Rx.Observable',
    'rxjs/add/observable/of': 'Rx.Observable'
  }
}
