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

import { Injectable } from '@angular/core';

import { ErrorInfo } from '../models/error.model';
import { ConfigModel } from '../models/config.model';
import { MappingModel, FieldMappingPair } from '../models/mapping.model';

@Injectable()
export class ValidationService {	
	public cfg: ConfigModel;
	
	public initialize(): void {
		this.cfg.mappingService.mappingUpdated$.subscribe(mappingDefinition => {
			this.validateMappings();
		});		
	}

	public validateMappings(): void {
		var mapping: MappingModel = this.cfg.mappings.activeMapping;
		if (mapping != null) {
			mapping.validationErrors = [];
			mapping.addValidationError("Source required");
			mapping.addValidationError("Separation index cannot be negative.");
			mapping.addValidationError("Separation index must be a number.");
		}
	}
}