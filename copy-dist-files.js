var fs = require('fs');
var ncp = require('ncp').ncp;
var mkdirp = require('mkdirp');

ncp.limit = 16;

function copyLibrary(libName) {
	var srcPath = "src/app/lib/" + libName;
	var destPath = "./aot/dist/lib/" + libName;

	console.log("Copying lib: " + libName);
	mkdirp.sync(destPath, function (err) {
    	if (err) console.error(err)
    	else console.log('lib dir created.')
	});

	ncp(srcPath, destPath, function (err) {
		if (err) {
			return console.error(err);
		}
		console.log('lib files copied.');
	});
}

copyLibrary("font-awesome-4.7.0");
copyLibrary("patternfly-3.19.0");
   
function copyFile(sourcePath, targetPath) {
	fs.createReadStream(sourcePath).pipe(fs.createWriteStream(targetPath));
}

var resources = [
  'node_modules/core-js/client/shim.min.js',
  'node_modules/zone.js/dist/zone.min.js',
  'src/app/lib/ipaas-data-mapper/styles.css'
];
resources.map(function(f) {
  var path = f.split('/');
  var t = 'aot/dist/' + path[path.length-1];
  copyFile(f, t);
});

copyFile("src/index-aot.html", "aot/dist/index.html");