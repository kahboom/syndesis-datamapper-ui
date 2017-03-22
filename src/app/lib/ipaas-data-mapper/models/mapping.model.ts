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

import { TransitionModel, TransitionMode } from './transition.model';

export class MappingModel {
	public uuid: string;
	public inputFieldPaths: string[] = [];
	public outputFieldPaths: string[] = [];		
	public transition: TransitionModel = new TransitionModel();	
	public fieldSeparatorIndexes: { [key:string]:string; } = {};

	public updateSeparatorIndexes(): void {
		var isSeparateMapping: boolean = (this.transition.mode == TransitionMode.SEPARATE);
		for (let fieldPath of this.inputFieldPaths.concat(this.outputFieldPaths)) {
			if (this.fieldSeparatorIndexes[fieldPath] == null) {
				this.fieldSeparatorIndexes[fieldPath] = "1";
			}
		}
	}

	public isFieldInMapping(fieldPath: string, isInput:boolean) {
		var fieldPaths: string[] = isInput ? this.inputFieldPaths : this.outputFieldPaths;
		return (fieldPaths.indexOf(fieldPath) != -1);
	}
}