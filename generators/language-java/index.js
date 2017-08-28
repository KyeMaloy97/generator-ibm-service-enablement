/*
 * Copyright IBM Corporation 2017
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const logger = require('log4js').getLogger("generator-service-enablement:language-java");
const Generator = require('yeoman-generator');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const PATH_MAPPINGS_FILE = "./src/main/resources/mappings.json";

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts);
    this.context = opts.context;
    logger.setLevel(this.context.loggerLevel);
    logger.debug("Constructing");
  }

  //setup all the values we need to pass in the context
  initializing() {
		this.context.dependenciesFile = "config.json.template";
		this.context.languageFileExt = "";

		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
    this.context.addInstrumentation = this._addInstrumentation.bind(this);
    this.context.srcFolders = [];
    this.context.instrumentationAdded = false;
    
    //initializing ourselves by composing with the service generators
    var root = path.join(path.dirname(require.resolve('../app')), '../');
    var folders = fs.readdirSync(root);
    folders.forEach(folder => {
      if(folder.startsWith('service-')) {
        logger.debug("Composing with service : " + folder);
        try {
          this.composeWith(path.join(root, folder), {context: this.context});
        } catch (err) {
          /* istanbul ignore next */      //ignore for code coverage as this is just a warning - if the service fails to load the subsequent service test will fail
          logger.warn('Unable to compose with service', folder, err);
        }
      }
    });
  }
  
  writing() {
    if(this.context.instrumentationAdded) {
      this._writeFiles(this.context.language + "/**", this.conf);
      this.context.srcFolders.forEach(folder => {
        if(fs.existsSync(folder)) {
          this._writeFiles(folder + "/**", this.conf)
        }
      })
    }
  }

  _addDependencies(serviceDependenciesString) {
    logger.debug("Adding dependencies", serviceDependenciesString);
    this.context._addDependencies(serviceDependenciesString);
  }

	_addMappings(serviceMappingsJSON){
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

  _addLocalDevConfig(devconf) {
    logger.debug("Adding devconf", devconf);
    this.context._addLocalDevConfig(devconf);
  }

  _addInstrumentation(instrumentation) {
    if(!this.context.instrumentationAdded) {
      this._addCoreDependencies();
      this.context.instrumentationAdded = true;
    }
    this.context.srcFolders = this.context.srcFolders.concat(instrumentation.sourceFilePath);
  }

  _addCoreDependencies() {
    let dependenciesString = this.fs.read(this.templatePath() + "/" + this.context.language + "/" + this.context.dependenciesFile);
    var template = handlebars.compile(dependenciesString);
    dependenciesString = template(this.context);
    this.context.addDependencies(dependenciesString);
  }

  _writeFiles(templatePath, data) {
    this.fs.copy(this.templatePath(templatePath), this.destinationPath(), { process : function (contents, filename) {
      var compiledTemplate = handlebars.compile(contents.toString());
      return compiledTemplate(data);
    }});
  }

}