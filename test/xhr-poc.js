/*
   Copyright 2013 Christopher Brown

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
describe('xhr-poc', function() {
    it('should find out about XHR', function() {
        var xhr = new XMLHttpRequest();
        for (var key in xhr) {
            console.log(key + ':' + xhr[key]);
        }
    });

    it('should override XHR', function() {
        var oldXHR = XMLHttpRequest;
        XMLHttpRequest = function() {
        };

        XMLHttpRequest.prototype = {
            send: function() {
                console.log('yay');
            }
        };

        var xhr = new XMLHttpRequest();
        xhr.send();

        console.log('here1');

        var x = new oldXHR();
        x.onreadystatechange = function() {
            console.log(x.readyState);
        }
        x.open('GET', 'base/test-data/test.json', true);
        console.log('here2');
        x.send();
        console.log('here3');

        waits(1000);
    });
});
