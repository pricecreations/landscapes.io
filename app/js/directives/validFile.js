// Copyright 2014 OpenWhere, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

angular.module('landscapesApp')
    .directive('validFile', function() {
        return {
            require:'ngModel',
            link:function(scope, el, attrs, ngModel){
                el.bind('change',function(){
                    scope.$apply(function(){
                        ngModel.$setViewValue(el.val());
                        ngModel.$render();
                    });
                });
            }
        }
    });