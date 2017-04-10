/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { Field } from './field.model';
import { MappingModel } from './mapping.model';
import { TransitionModel, TransitionMode } from './transition.model';

export class DocumentInitializationConfig {
    documentIdentifier: string;
    classPath: string;
    initialized: boolean = false;
    errorOccurred: boolean = false;
}

export class DocumentDefinition {
    public initCfg: DocumentInitializationConfig = new DocumentInitializationConfig();
    
    public name: string;
    public fullyQualifiedName: string;
    public fields: Field[] = [];
    public allFields: Field[] = [];
    public terminalFields: Field[] = [];
    public isSource: boolean;
    public complexFieldsByClassName: { [key:string]:Field; } = {};
    public enumFieldsByClassName: { [key:string]:Field; } = {};
    public debugParsing: boolean = false;    
    public fieldsByPath: { [key:string]:Field; } = {};
    private pathSeparator: string = ".";
    private static noneField: Field = null;
    public uri: string = null;
    public fieldPaths: string[] = [];


    public getComplexField(className: string): Field {
        return this.complexFieldsByClassName[className];
    }

    public getEnumField(className: string): Field {
        return this.enumFieldsByClassName[className];
    }

    public getAllFields(): Field[] {
        return [].concat(this.allFields);
    }

    public getNoneField(): Field {
        if (DocumentDefinition.noneField == null) {
            DocumentDefinition.noneField = new Field();
            DocumentDefinition.noneField.name = "[None]";
            DocumentDefinition.noneField.type = "";
            DocumentDefinition.noneField.displayName = "[None]";
            DocumentDefinition.noneField.path = "[None]";
        } 
        return DocumentDefinition.noneField;
    }

    public getFields(fieldPaths: string[]): Field[] {
        var fields: Field[] = [];
        for (let fieldPath of fieldPaths) {
            var field: Field = this.getField(fieldPath);
            if (field != null) {
                fields.push(field);
            }
        }
        return fields;
    }
	
    public getField(fieldPath: string): Field {
        if (fieldPath == this.getNoneField().path) {
            return this.getNoneField();
        }
        var field: Field = this.fieldsByPath[fieldPath];
        //if we can't find the field we're looking for, find parent fields and populate their children
        if (field == null && (fieldPath.indexOf(this.pathSeparator) != -1)) {
            var originalPath: string = fieldPath;
            var currentParentPath: string = null;
            while (originalPath.indexOf(this.pathSeparator) != -1) {
                var currentPathSection: string = originalPath.substr(0, originalPath.indexOf(this.pathSeparator));
                currentParentPath = (currentParentPath == null) ? currentPathSection : (currentParentPath + this.pathSeparator + currentPathSection);
                console.log("Populating children for '" + currentParentPath + "' (from: " + fieldPath + ")");
                var parentField: Field = this.fieldsByPath[currentParentPath];
                if (parentField == null) {
                    throw new Error("Could not populate parent field with path '" 
                        + currentParentPath + "' (for: " + fieldPath + ")")
                }
                this.populateChildren(parentField);
                if (originalPath.indexOf(this.pathSeparator) != -1) {
                    originalPath = originalPath.substr(originalPath.indexOf(this.pathSeparator) + 1);
                }
            }
            field = this.fieldsByPath[fieldPath];
        }
        return field;
    }   

    public getTerminalFields(includeNoneOption: boolean): Field[] {
        if (includeNoneOption) {            
            return [this.getNoneField()].concat(this.terminalFields);
        }
        return [].concat(this.terminalFields);
    }

    public clearSelectedFields(): void {
        for (let field of this.allFields) {
            field.selected = false;
        }
    }

    public getSelectedFields(): Field[] {
        var fields: Field[] = [];
        for (let field of this.allFields) {
            if (field.selected) {
                fields.push(field);
            }
        }
        return fields;
    }

    public selectFields(fieldPaths: string[]): void {
        for (let fieldPath of fieldPaths) {
            var field: Field = this.getField(fieldPath);
            if (field != null) {
                field.selected = true;
                //make all parent fields visible too
                var parentField: Field = field.parentField;
                while (parentField != null) {
                    parentField.collapsed = false;
                    parentField = parentField.parentField;
                }
            }
        }
    }  

    public populateFromFields(): void {
        this.prepareComplexFields();

        this.alphabetizeFields(this.fields);

        for (let field of this.fields) {
            this.populateFieldParentPaths(field, "", 0);
            this.populateFieldData(field);
        }     

        this.fieldPaths.sort();    

        if (this.debugParsing) {
            console.log(this.printDocumentFields(this.fields, 0));
            var enumFields: string = "Enum fields:\n";
            for (let field of this.allFields) {
                if (field.enumeration) {
                    enumFields += "\t" + field.path + " (" + field.className + ")\n";
                }
            }
            console.log(enumFields);
        }

        console.log("Finished populating fields for '" + this.name + "', field count: " + this.allFields.length + ", terminal: " + this.terminalFields.length + ".");
    }

    private alphabetizeFields(fields: Field[]) {
        var fieldsByName: { [key:string]:Field; } = {};
        var fieldNames: string[] = [];
        for (let field of fields) {
            var name: string = field.name;
            var firstCharacter: string = name.charAt(0).toUpperCase();
            name = firstCharacter + name.substring(1);
            field.displayName = name;
            //if field is a dupe, discard it
            if (fieldsByName[name] != null) {
                continue;
            }
            fieldsByName[name] = field;
            fieldNames.push(name);
        }
        fieldNames.sort();
        fields.length = 0;
        for (let name of fieldNames) {
            fields.push(fieldsByName[name]);
        }

        for (let field of fields) {
            if (field.children && field.children.length) {
                this.alphabetizeFields(field.children);
            }
        }
    }

    private populateFieldParentPaths(field: Field, parentPath: string, depth: number): void {        
        field.path = parentPath + field.displayName;
        field.serviceObject.path = field.path;
        field.fieldDepth = depth;
        for (let childField of field.children) {
            childField.parentField = field;
            this.populateFieldParentPaths(childField, parentPath + field.displayName + this.pathSeparator, depth + 1);
        }
    }

    private populateFieldData(field:Field) {
        this.fieldPaths.push(field.path);
        this.allFields.push(field);
        this.fieldsByPath[field.path] = field;
        if (field.enumeration) {
            this.enumFieldsByClassName[field.className] = field;
        }
        if (field.isTerminal()) {
            this.terminalFields.push(field);
        } else {
            for (let childField of field.children) {
                this.populateFieldData(childField);
            }
        }
    }   

    public populateChildren(field: Field): void {
        //populate complex fields
        if (field.isTerminal() || (field.children.length > 0)) {
            return;
        }
         
        console.log("Populating complex field's children: " + field.path + " (" + field.className + ")");   
        var cachedField = this.getComplexField(field.className);
        if (cachedField == null) {
            console.error("ERROR: Couldn't find cached complex field: " + field.className);
            return;
        }

        //copy cached field children
        cachedField = cachedField.copy();
        for (let childField of cachedField.children) {
            childField = childField.copy();
            childField.parentField = field;
            this.populateFieldParentPaths(childField, field.path + this.pathSeparator, field.fieldDepth + 1);  
            this.populateFieldData(childField);
            field.children.push(childField);
        }
        this.fieldPaths.sort(); 

    }

    private prepareComplexFields() {
        var fields: Field[] = this.fields;

        //build complex field cache
        this.discoverComplexFields(fields);

        for (let key in this.complexFieldsByClassName) {
            var cachedField: Field = this.complexFieldsByClassName[key];
            //remove children more than one level deep in cached fields
            for (let childField of cachedField.children) {
                childField.children = [];
            }
            //alphebitze complex field's childrein
            this.alphabetizeFields(cachedField.children);
        }

        // print cached complex fields
        if (this.debugParsing) {
            var result: string = "Cached Fields: ";
            for (let key in this.complexFieldsByClassName) {
                var cachedField: Field = this.complexFieldsByClassName[key];
                result +=  cachedField.name + " " + cachedField.type + " " + cachedField.serviceObject.status 
                    + " (" + cachedField.className + ") children:" + cachedField.children.length + "\n";
            }
            console.log(result);
        }

        //remove children more than one layer deep in root fields
        for (let field of fields) {
            for (let childField of field.children) {
                childField.children = [];
            }
        }        
    }    

    private discoverComplexFields(fields: Field[]): void {
        for (let field of fields) {
            if (field.type != "COMPLEX") {
                continue;
            }
            if (field.serviceObject.status == "SUPPORTED") {
                this.complexFieldsByClassName[field.className] = field.copy();
            }
            if (field.children) {
                this.discoverComplexFields(field.children);
            }
        }
    }

    private printDocumentFields(fields: Field[], indent: number): string {
        var result: string = "";
        for (let f of fields) {
            if (f.type != "COMPLEX") {
                continue;
            }
            for (var i = 0; i < indent; i++) {
                result += "\t";
            }
            result += f.name + " " + f.type + " " + f.serviceObject.status + " (" + f.className + ") children:" + f.children.length;
            result += "\n";
            if (f.children) {
                result += this.printDocumentFields(f.children, indent + 1);
            }
        }
        return result;
    }

    public updateFromMappings(mappings: MappingModel[]): void {
        for (let field of this.allFields) {
            field.partOfMapping = false;
            field.hasUnmappedChildren = false;
        }
        for (let mapping of mappings) {
            var partOfTransformation: boolean = (mapping.transition.mode == TransitionMode.SEPARATE)
                || (mapping.transition.mode == TransitionMode.ENUM);
            var fieldPaths: string[] = this.isSource ? mapping.inputFieldPaths : mapping.outputFieldPaths;
            for (let field of this.getFields(fieldPaths)) {
                field.partOfMapping = true;   
                field.partOfTransformation = partOfTransformation;
                var parentField: Field = field.parentField;
                while (parentField != null) {
                    parentField.partOfMapping = true; 
                    parentField.partOfTransformation = partOfTransformation;
                    parentField = parentField.parentField;
                }
            }
        }
        for (let field of this.allFields) {
            field.hasUnmappedChildren = this.fieldHasUnmappedChild(field);  
        }
    }

    private fieldHasUnmappedChild(field: Field): boolean {
        if (field == null) {
            return false;
        }
        if (field.isTerminal()) {
            return (field.partOfMapping == false);
        }
        for (let childField of field.children) {
            if (childField.hasUnmappedChildren || this.fieldHasUnmappedChild(childField)) {
                return true;
            }
        }
        return false;
    }
}