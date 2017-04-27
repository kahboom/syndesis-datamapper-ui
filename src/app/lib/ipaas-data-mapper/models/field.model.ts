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

import { DocumentDefinition } from './document.definition.model';

export class EnumValue {
    name: string;
    ordinal: number;
}

export class Field {
	name: string;
    className: string;
    displayName: string;
	path: string;
	type: string;
	serviceObject: any;
	parentField: Field;
	partOfMapping: boolean = false;	
    partOfTransformation: boolean = false;
	visible:boolean = true;
	selected:boolean = false;
    enumeration:boolean = false;
    enumValues: EnumValue[] = [];
	children: Field[] = [];
    fieldDepth: number = 0;
    uuid: string;
    static uuidCounter: number = 0;
    collapsed: boolean = true;
    hasUnmappedChildren: boolean = false;
    isCollection: boolean = false;
    availableForSelection: boolean = true;
    selectionExclusionReason: string = null;
    docDef: DocumentDefinition;

    constructor() {
        this.uuid = Field.uuidCounter.toString();
        Field.uuidCounter++;
    }
	
    public isTerminal(): boolean {
        if (this.enumeration) {
            return true;
        }
        if (this.isCollection) {
            return false;
        }
    	return (this.type != "COMPLEX");
    }

    public copy(): Field {
    	var copy: Field = new Field();
    	copy.name = this.name;
    	copy.displayName = this.displayName;
        copy.path = this.path;
    	copy.type = this.type;
    	copy.serviceObject = new Object();
        for (var property in this.serviceObject) {
            copy.serviceObject[property] = this.serviceObject[property];
        }
    	copy.parentField = null;
    	copy.partOfMapping = this.partOfMapping;
        copy.partOfTransformation = this.partOfTransformation;
    	copy.visible = this.visible;
    	copy.selected = this.selected;
        copy.fieldDepth = this.fieldDepth;
        copy.collapsed = this.collapsed;
        copy.hasUnmappedChildren = this.hasUnmappedChildren;
        copy.isCollection = this.isCollection;
        copy.availableForSelection = this.availableForSelection;
        copy.selectionExclusionReason = this.selectionExclusionReason;
        copy.docDef = this.docDef;
    	for (let childField of this.children) {
    		copy.children.push(childField.copy());
    	}
    	return copy;
    }

    public copyFrom(that:Field ): void {
        this.name = that.name;
        this.displayName = that.displayName;
        this.path = that.path;
        this.type = that.type;
        this.serviceObject = new Object();
        for (var property in that.serviceObject) {
            this.serviceObject[property] = that.serviceObject[property];
        }
        this.parentField = null;
        this.partOfMapping = that.partOfMapping;
        this.partOfTransformation = that.partOfTransformation;
        this.visible = that.visible;
        this.selected = that.selected;
        this.fieldDepth = that.fieldDepth;
        this.collapsed = that.collapsed;
        this.hasUnmappedChildren = that.hasUnmappedChildren;
        this.isCollection = that.isCollection;
        this.availableForSelection = that.availableForSelection;
        this.selectionExclusionReason = that.selectionExclusionReason;
        this.docDef = that.docDef;
        for (let childField of that.children) {
            this.children.push(childField.copy());
        }
    }

    public isInCollection(): boolean {
        var parent: Field = this;
        while (parent != null) {
            if (parent.isCollection) {
                return true;
            }
            parent = parent.parentField;
        }
    }

    public isSource(): boolean {
        return (this.docDef != null) && this.docDef.isSource;
    }

    public static fieldHasUnmappedChild(field: Field): boolean {
        if (field == null) {
            return false;
        }
        if (field.isTerminal()) {
            return (field.partOfMapping == false);
        }
        for (let childField of field.children) {
            if (childField.hasUnmappedChildren || Field.fieldHasUnmappedChild(childField)) {
                return true;
            }
        }
        return false;
    }

    public static getFieldPaths(fields: Field[]): string[] {
        var paths: string[] = [];
        for (let field of fields) {
            paths.push(field.path);
        }
        return paths;
    }

    public static getField(fieldPath: string, fields: Field[]): Field {
        for (let field of fields) {
            if (fieldPath == field.path) {
                return field;
            }
        }
        return null;
    }
}