## Data Mapper UI ##

Variables used in this document:

- ${atlasui.home} is the folder the data-mapper ui was checked out into

[INITIAL SETUP]

Reference: angular 2 env setup guide: https://angular.io/docs/ts/latest/guide/setup.html

1) install NPM: https://docs.npmjs.com/getting-started/installing-node
2) run 'npm install' in ${atlasui.home} to install node modules

[RUNNING THE UI]

1) build all of the atlas 2 maven projects by executing 'mvn clean install' in ${atlasui.home}

2) run 'mvn jetty:run' in ${atlasui.home}/atlas2.java.parent/atlas2.java.service

	This will host the java inspection rest service on port 8585, example url to test that it's up:

	http://localhost:8585/v2/atlas/java/class?className=com.mediadriver.atlas.java.service.v2.TestAddress

3) run 'npm start' in a terminal from ${atlasui.home} to start the UI

	This should automatically open the ui in your browser with a "Angular Quickstart" tab, if it doesn't, open this URL in a tab:

	http://localhost:3000/

[Compiling And Running With AOT]

Reference: angular 2 AOT compilation guide: https://angular.io/docs/ts/latest/cookbook/aot-compiler.html

1) compile with "npm run aot:build"
2) strip unused code with "npm run aot:rollup"
3) copy misc js/html/css files we need with "npm run aot:copy"
4) run aot artifact with "npm run aot:serve"

[SAMPLE]

1) The src/app/lib/ipaas-data-mapper/components/data.mapper.example.host.component.ts provides an example of how to consume the Data Mapper UI component

[TROUBLESHOOTING]

#1: Compile errors: If the UI doesn't run, check the terminal window where you ran 'npm start', there may be compilation errors reported there even if it attempts to run the UI successfully without exiting with error.

#2: Check the console window of chrome's developer tools window for errors, this is found via the chrome "view->developer->developer tools" menu, the javascript console will be on the bottom of the tab you've opened the tools in.