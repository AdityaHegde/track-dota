(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD.
    define(['jquery', 'ember', 'ember_data'], factory);
  } else {
    // Browser globals.
    factory(root.$);
  }
}(this, function($) {

/**
 * @license almond 0.3.0 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD.
    define('lib/ember-utils-core',['jquery', 'ember'], factory);
  } else {
    // Browser globals.
    root.Utils = factory(root.$);
  }
}(this, function($) {
/**
 * @license almond 0.3.0 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("lib/almond.js", function(){});

define('hasMany',[
  "ember",
], function() {

/**
 * Creates a computed property for an array that when set with array of native js object will return an array of instances of a class.
 *
 * The class is decided by the 1st param 'modelClass'. If it is not a class but an object and 'modelClassKey', the 2nd parameter is a string,
 * then the 'modelClassKey' in the object is used as a key in 'modelClass' the object to get the class.
 * 'defaultKey' the 3rd parameter is used as a default if object[modelClassKey] is not present.
 *
 * @method hasMany
 * @for Utils
 * @static
 * @param {Class|Object} modelClass
 * @param {String} [modelClassKey]
 * @param {String} [defaultKey]
 * @returns {Instance}
 */
function hasMany(modelClass, modelClassKey, defaultKey) {
  modelClass = modelClass || Ember.Object;
  var hasInheritance = Ember.typeOf(modelClass) !== "class";

  return Ember.computed(function(key, newval) {
    if(Ember.typeOf(modelClass) === 'string') {
      modelClass = Ember.get(modelClass);
      hasInheritance = Ember.typeOf(modelClass) !== "class";
    }
    if(arguments.length > 1) {
      if(newval && newval.length) {
        newval.beginPropertyChanges();
        for(var i = 0; i < newval.length; i++) {
          var obj = newval[i], classObj = modelClass;
          if(hasInheritance) classObj = modelClass[Ember.isEmpty(obj[modelClassKey]) ? defaultKey : obj[modelClassKey]];
          if(!(obj instanceof classObj)) {
            obj = classObj.create(obj);
            obj.set("parentObj", this);
          }
          newval.splice(i, 1, obj);
        }
        newval.endPropertyChanges();
      }
      return newval;
    }
  });
};

return {
  hasMany : hasMany,
};


});

define('belongsTo',[
  "ember",
], function() {

/**
 * Creates a computed property for an object that when set with native js object will return an instances of a class.
 *
 * The class is decided by the 1st param 'modelClass'. If it is not a class but an object and 'modelClassKey', the 2nd parameter is a string,
 * then the 'modelClassKey' in the object is used as a key in 'modelClass' the object to get the class.
 * 'defaultKey' the 3rd parameter is used as a default if object[modelClassKey] is not present.
 *
 * Optionally can create the instance with mixin. A single mixin can be passed or a map of mixins as 4th parameter with key extracted from object using mixinKey (5th parameter) can be passed.
 * 'defaultMixin' (6th parameter) is used when object[mixinKey] is not present.
 *
 * @method belongsTo
 * @for Utils
 * @static
 * @param {Class|Object} modelClass
 * @param {String} [modelClassKey]
 * @param {String} [defaultKey]
 * @param {Mixin|Object} [mixin]
 * @param {String} [mixinKey]
 * @param {String} [defaultMixin]
 * @returns {Instance}
 */
function belongsTo(modelClass, modelClassKey, defaultKey, mixin, mixinKey, defaultMixin) {
  modelClass = modelClass || Ember.Object;
  var hasInheritance = Ember.typeOf(modelClass) !== "class",
      hasMixin = mixin instanceof Ember.Mixin,
      hasMixinInheritance = !hasMixin && Ember.typeOf(mixin) === "object";
  return Ember.computed(function(key, newval) {
    if(Ember.typeOf(modelClass) === 'string') {
      modelClass = Ember.get(modelClass);
      hasInheritance = Ember.typeOf(modelClass) !== "class";
    }
    if(Ember.typeOf(mixin) === 'string') {
      mixin = Ember.get(mixin);
      hasMixin = mixin instanceof Ember.Mixin;
      hasMixinInheritance = !hasMixin && Ember.typeOf(mixin) === "object";
    }
    if(arguments.length > 1) {
      if(newval) {
        var classObj = modelClass;
        if(hasInheritance) classObj = modelClass[Ember.isEmpty(newval[modelClassKey]) ? defaultKey : newval[modelClassKey]];
        if(!(newval instanceof classObj)) {
          if(hasMixin) {
            newval = classObj.createWithMixins(mixin, newval);
          }
          else if(hasMixinInheritance) {
            newval = classObj.createWithMixins(mixin[newval[mixinKey] || defaultMixin], newval);
          }
          else {
            newval = classObj.create(newval);
          }
          newval.set("parentObj", this);
        }
      }
      return newval;
    }
  });
};

return {
  belongsTo : belongsTo,
}


});

define('hierarchy',[
  "ember",
], function() {


function getMetaFromHierarchy(hasManyHierarchy) {
  var meta = {};
  for(var i = 0; i < hasManyHierarchy.length; i++) {
    for(var c in hasManyHierarchy[i].classes) {
      if(hasManyHierarchy[i].classes.hasOwnProperty(c)) {
        meta[c] = {
          level : i,
        };
      }
    }
  }
  hasManyHierarchy.hierarchyMeta = meta;
  return meta;
}

/**
 * Register a hierarchy. This will setup the meta of the hierarchy.
 *
 * @method registerHierarchy
 * @for Utils
 * @static
 * @param {Object} hierarchy
 */
function registerHierarchy(hierarchy) {
  hierarchy.hierarchyMeta = getMetaFromHierarchy(hierarchy);
};

/**
 * Add an entry to the hierarchy. It takes care of updating meta also.
 *
 * @method addToHierarchy
 * @static
 * @param {Object} hierarchy
 * @param {String} type
 * @param {Class} classObj
 * @param {Number} level
 */
function addToHierarchy(hierarchy, type, classObj, level) {
  var meta = hierarchy.hierarchyMeta;
  hierarchy[level].classes[type] = classObj;
  meta[type] = {
    level : level,
  };
};

function getObjForHierarchyLevel(obj, meta, hierarchy, level) {
  var param = {};
  param[hierarchy[level].childrenKey] = Ember.typeOf(obj) === "array" ? obj : [obj];
  return hierarchy[level].classes[hierarchy[level].base].create(param);
}

function getObjTillLevel(obj, meta, hierarchy, fromLevel, toLevel) {
  for(var i = fromLevel - 1; i >= toLevel; i--) {
    obj = getObjForHierarchyLevel(obj, meta, hierarchy, i);
  }
  return obj;
}

/**
 * Creates a computed property which creates a class for every element in the set array based on hierarchy.
 * The objects in the array can be of any level at or below the current level. An instance with the basic class is automatically wrapped around the objects at lower level.
 *
 * @method hasManyWithHierarchy
 * @static
 * @param {Object} hasManyHierarchy Assumed to be already initialized by calling 'registerHierarchy'.
 * @param {Number} level Level of the computed property.
 * @param {String} key Key used to get the key used in retrieving the class object in the classes map.
 * @returns {Instance}
 */
function hasManyWithHierarchy(hasManyHierarchy, level, hkey) {
  var meta;
  if(Ember.typeOf(hasManyHierarchy) === "array") {
    meta = hasManyHierarchy.hierarchyMeta;
  }
  return Ember.computed(function(key, newval) {
    if(arguments.length > 1) {
      if(Ember.typeOf(hasManyHierarchy) === "string") {
        hasManyHierarchy = Ember.get(hasManyHierarchy);
        meta = hasManyHierarchy.hierarchyMeta;
      }
      if(newval) {
        //curLevel, curLevelArray
        var cl = -1, cla = [];
        for(var i = 0; i < newval.length; i++) {
          var obj = newval[i], _obj = {},
              type = Ember.typeOf(obj) === "array" ? obj[0] : obj[hkey],
              objMeta = meta[type];
          if(Ember.typeOf(obj) !== "instance") {
            if(objMeta && objMeta.level >= level) {
              if(Ember.typeOf(obj) === "array") {
                for(var j = 0; j < hasManyHierarchy[objMeta.level].keysInArray.length; j++) {
                  if(j < obj.length) {
                    _obj[hasManyHierarchy[objMeta.level].keysInArray[j]] = obj[j];
                  }
                }
              }
              else {
                _obj = obj;
              }
              _obj = hasManyHierarchy[objMeta.level].classes[type].create(_obj);
              if(cl === -1 || cl === objMeta.level) {
                cla.push(_obj);
                cl = objMeta.level;
              }
              else if(cl < objMeta.level) {
                cla.push(getObjTillLevel(_obj, meta, hasManyHierarchy, objMeta.level, cl));
              }
              else {
                var curObj = getObjForHierarchyLevel(cla, meta, hasManyHierarchy, objMeta.level);
                cl = objMeta.level;
                cla = [curObj, _obj];
              }
            }
          }
          else {
            cla.push(obj);
          }
        }
        if(cl === level || cl === -1) {
          newval = cla;
        }
        else {
          newval = [getObjTillLevel(cla, meta, hasManyHierarchy, cl, level)];
        }
      }
      return newval;
    }
  });
};


return {
  registerHierarchy : registerHierarchy,
  addToHierarchy : addToHierarchy,
  hasManyWithHierarchy : hasManyWithHierarchy,
};

});

define('objectWithArrayMixin',[
  "ember",
], function() {


/**
 * A mixin to add observers to array properties.
 *
 * @class Utils.ObjectWithArrayMixin
 * @static
 */
var ObjectWithArrayMixin = Ember.Mixin.create({
  init : function() {
    this._super();
    Ember.set(this, "arrayProps", this.get("arrayProps") || []);
    this.addArrayObserverToProp("arrayProps");
    Ember.set(this, "arrayProps.propKey", "arrayProps");
    this.arrayPropsWasAdded(this.get("arrayProps") || []);
  },

  addBeforeObserverToProp : function(propKey) {
    Ember.addBeforeObserver(this, propKey, this, "propWillChange");
  },

  removeBeforeObserverFromProp : function(propKey) {
    Ember.removeBeforeObserver(this, propKey, this, "propWillChange");
  },

  addObserverToProp : function(propKey) {
    Ember.addObserver(this, propKey, this, "propDidChange");
  },

  removeObserverFromProp : function(propKey) {
    Ember.removeObserver(this, propKey, this, "propDidChange");
  },

  propWillChange : function(obj, key) {
    this.removeArrayObserverFromProp(key);
    var prop = this.get(key);
    if(prop && prop.objectsAt) {
      var idxs = Utils.getArrayFromRange(0, prop.get("length"));
      this[key+"WillBeDeleted"](prop.objectsAt(idxs), idxs, true);
    }
  },

  propDidChange : function(obj, key) {
    this.addArrayObserverToProp(key);
    var prop = this.get(key);
    if(prop) {
      this.propArrayNotifyChange(prop, key);
    }
  },

  propArrayNotifyChange : function(prop, key) {
    if(prop.objectsAt) {
      var idxs = Utils.getArrayFromRange(0, prop.get("length"));
      this[key+"WasAdded"](prop.objectsAt(idxs), idxs, true);
    }
  },

  addArrayObserverToProp : function(propKey) {
    var prop = this.get(propKey);
    if(prop && prop.addArrayObserver) {
      prop.set("propKey", propKey);
      prop.addArrayObserver(this, {
        willChange : this.propArrayWillChange,
        didChange : this.propArrayDidChange,
      });
    }
  },

  removeArrayObserverFromProp : function(propKey) {
    var prop = this.get(propKey);
    if(prop && prop.removeArrayObserver) {
      prop.removeArrayObserver(this, {
        willChange : this.propArrayWillChange,
        didChange : this.propArrayDidChange,
      });
    }
  },

  propArrayWillChange : function(array, idx, removedCount, addedCount) {
    if((array.content || array.length) && array.get("length") > 0) {
      var propKey = array.get("propKey"), idxs = Utils.getArrayFromRange(idx, idx + removedCount);
      this[propKey+"WillBeDeleted"](array.objectsAt(idxs), idxs);
    }
  },
  propArrayDidChange : function(array, idx, removedCount, addedCount) {
    if((array.content || array.length) && array.get("length") > 0) {
      var propKey = array.get("propKey"),
          addedIdxs = [], removedObjs = [],
          rc = 0;
      for(var i = idx; i < idx + addedCount; i++) {
        var obj = array.objectAt(i);
        if(!this[propKey+"CanAdd"](obj, i)) {
          removedObjs.push(obj);
          rc++;
        }
        else {
          addedIdxs.push(i);
        }
      }
      if(addedIdxs.length > 0) {
        this[propKey+"WasAdded"](array.objectsAt(addedIdxs), addedIdxs);
      }
      if(removedObjs.length > 0) {
        array.removeObjects(removedObjs);
      }
    }
  },

  /**
   * Method called just before array elements will be deleted. This is a fallback method. A method with name <propKey>WillBeDeleted can be added to handle for 'propKey' seperately.
   *
   * @method propWillBeDeleted
   * @param {Array} eles The elements that will be deleted.
   * @param {Array} idxs The indices of the elements that will be deleted.
   */
  propWillBeDeleted : function(eles, idxs) {
  },
  /**
   * Method called when deciding whether to add an ele or not. This is a fallback method. A method with name <propKey>CanAdd can be added to handle for 'propKey' seperately.
   *
   * @method propCanAdd
   * @param {Object|Instance} ele The element that can be added or not.
   * @param {Number} idx The indice of the element that can be added or not.
   * @returns {Boolean}
   */
  propCanAdd : function(ele, idx) {
    return true;
  },
  /**
   * Method called after array elements are added. This is a fallback method. A method with name <propKey>WasAdded can be added to handle for 'propKey' seperately.
   *
   * @method propWasAdded
   * @param {Array} eles The elements that are added.
   * @param {Array} idxs The indices of the elements that are added.
   */
  propWasAdded : function(eles, idxs) {
  },

  /**
   * List of keys to array properties.
   *
   * @property arrayProps
   * @type Array
   */
  arrayProps : null,
  arrayPropsWillBeDeleted : function(arrayProps) {
    for(var i = 0; i < arrayProps.length; i++) {
      this.removeArrayObserverFromProp(arrayProps[i]);
      this.removeBeforeObserverFromProp(arrayProps[i]);
      this.removeObserverFromProp(arrayProps[i]);
    }
  },
  arrayPropsCanAdd : function(ele, idx) {
    return true;
  },
  arrayPropsWasAdded : function(arrayProps) {
    for(var i = 0; i < arrayProps.length; i++) {
      this.arrayPropWasAdded(arrayProps[i]);
    }
  },
  arrayPropWasAdded : function(arrayProp) {
    var prop = this.get(arrayProp);
    if(!this[arrayProp+"WillBeDeleted"]) this[arrayProp+"WillBeDeleted"] = this.propWillBeDeleted;
    if(!this[arrayProp+"CanAdd"]) this[arrayProp+"CanAdd"] = this.propCanAdd;
    if(!this[arrayProp+"WasAdded"]) this[arrayProp+"WasAdded"] = this.propWasAdded;
    if(!prop) {
      this.set(arrayProp, []);
    }
    else {
      this.propArrayNotifyChange(prop, arrayProp);
    }
    this.addArrayObserverToProp(arrayProp);
    this.addBeforeObserverToProp(arrayProp);
    this.addObserverToProp(arrayProp);
  },

});


return {
  ObjectWithArrayMixin : ObjectWithArrayMixin,
};

});

define('misc',[
  "ember",
], function() {

/**
 * Search in a multi level array.
 *
 * @method deepSearchArray
 * @for Utils
 * @static
 * @param {Object} d Root object to search from.
 * @param {any} e Element to search for.
 * @param {String} k Key of the element in the object.
 * @param {String} ak Key of the array to dig deep.
 * @returns {Object} Returns the found object.
 */
function deepSearchArray(d, e, k, ak) { //d - data, e - element, k - key, ak - array key
  if(e === undefined || e === null) return null;
  if(d[k] === e) return d;
  if(d[ak]) {
    for(var i = 0; i < d[ak].length; i++) {
      var ret = Utils.deepSearchArray(d[ak][i], e, k, ak);
      if(ret) {
        return ret;
      }
    }
  }
  return null;
};

/**
 * Binary insertion within a sorted array.
 *
 * @method binaryInsert
 * @static
 * @param {Array} a Sorted array to insert in.
 * @param {any} e Element to insert.
 * @param {Function} [c] Optional comparator to use.
 */
var cmp = function(a, b) {
  return a - b;
};
var binarySearch = function(a, e, l, h, c) {
  var i = Math.floor((h + l) / 2), o = a.objectAt(i);
  if(l > h) return l;
  if(c(e, o) >= 0) {
    return binarySearch(a, e, i + 1, h, c);
  }
  else {
    return binarySearch(a, e, l, i - 1, c);
  }
};
function binaryInsert(a, e, c) {
  c = c || cmp;
  var len = a.get("length");
  if(len > 0) {
    var i = binarySearch(a, e, 0, len - 1, c);
    a.insertAt(i, e);
  }
  else {
    a.pushObject(e);
  }
};

/**
 * Merge a src object to a tar object and return tar.
 *
 * @method merge
 * @static
 * @param {Object} tar Target object.
 * @param {Object} src Source object.
 * @param {Boolean} [replace=false] Replace keys if they already existed.
 * @returns {Object} Returns the target object.
 */
function merge(tar, src, replace) {
  for(var k in src) {
    if(!src.hasOwnProperty(k) || !Ember.isNone(tar[k])) {
      continue;
    }
    if(Ember.isEmpty(tar[k]) || replace) {
      tar[k] = src[k];
    }
  }
  return tar;
};

/**
 * Checks if an object has any key.
 *
 * @method hashHasKeys
 * @static
 * @param {Object} hash Object to check for keys.
 * @returns {Boolean}
 */
function hashHasKeys(hash) {
  for(var k in hash) {
    if(hash.hasOwnProperty(k)) return true;
  }
  return false;
};

/**
 * Returns an array of integers from a starting number to another number with steps.
 *
 * @method getArrayFromRange
 * @static
 * @param {Number} l Starting number.
 * @param {Number} h Ending number.
 * @param {Number} s Steps.
 * @returns {Array}
 */
function getArrayFromRange(l, h, s) {
  var a = [];
  s = s || 1;
  for(var i = l; i < h; i += s) {
    a.push(i);
  }
  return a;
};

var extractIdRegex = /:(ember\d+):?/;
/**
 * Get the ember assigned id to the instance.
 *
 * @method getEmberId
 * @static
 * @param {Instance} obj
 * @returns {String} Ember assigned id.
 */
function getEmberId(obj) {
  var str = obj.toString(), match = str.match(extractIdRegex);
  return match && match[1];
};

/**
 * Recursively return the offset of an element relative to a parent element.
 *
 * @method getOffset
 * @static
 * @param {DOMElement} ele
 * @param {String} type Type of the offset.
 * @param {String} parentSelector Selector for the parent.
 * @param {Number} Offset.
 */
function getOffset(ele, type, parentSelector) {
  parentSelector = parentSelector || "body";
  if(!Ember.isEmpty($(ele).filter(parentSelector))) {
    return 0;
  }
  return ele["offset"+type] + Utils.getOffset(ele.offsetParent, type, parentSelector);
};

function emberDeepEqual(src, tar) {
  for(var k in tar) {
    var kObj = src.get(k);
    if(Ember.typeOf(tar[k]) === "object" || Ember.typeOf(tar[k]) === "instance") {
      return Utils.emberDeepEqual(kObj, tar[k]);
    }
    else if(Ember.typeOf(tar[k]) === "array") {
      for(var i = 0; i < tar[k].length; i++) {
        if(!Utils.emberDeepEqual(kObj.objectAt(i), tar[k][i])) {
          return false;
        }
      }
    }
    else if(tar[k] !== kObj) {
      console.log(kObj + " not equal to " + tar[k] + " for key : " + k);
      return false;
    }
  }
  return true;
};

return {
  deepSearchArray : deepSearchArray,
  binaryInsert : binaryInsert,
  merge : merge,
  hashHasKeys : hashHasKeys,
  getArrayFromRange : getArrayFromRange,
  getEmberId : getEmberId,
  getOffset : getOffset,
  emberDeepEqual : emberDeepEqual,
};

});

/**
 * @module ember-utils-core
 */
define('ember-utils-core',[
  "./hasMany",
  "./belongsTo",
  "./hierarchy",
  "./objectWithArrayMixin",
  //"./hashMapArray",
  "./misc",
], function() {
  /**
   * Global class
   *
   * @class Utils
   */
  var Utils = Ember.Namespace.create();
  window.Utils = Utils;

  //start after DS
  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        Utils[k] = arguments[i][k];
      }
    }
  }

  return Utils;
});

  // Register in the values from the outer closure for common dependencies
  // as local almond modules
  define('jquery', function() {
    return $;
  });
  define('ember', function() {
    return Ember;
  });
 
  // Use almond's special top level synchronous require to trigger factory
  // functions, get the final module, and export it as the public api.
  return require('ember-utils-core');
}));

/*!
 * Bootstrap v3.2.0 (http://getbootstrap.com)
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

if (typeof jQuery === 'undefined') { throw new Error('Bootstrap\'s JavaScript requires jQuery') }

/* ========================================================================
 * Bootstrap: transition.js v3.2.0
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap')

    var transEndEventNames = {
      WebkitTransition : 'webkitTransitionEnd',
      MozTransition    : 'transitionend',
      OTransition      : 'oTransitionEnd otransitionend',
      transition       : 'transitionend'
    }

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] }
      }
    }

    return false // explicit for ie8 (  ._.)
  }

  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false
    var $el = this
    $(this).one('bsTransitionEnd', function () { called = true })
    var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
    setTimeout(callback, duration)
    return this
  }

  $(function () {
    $.support.transition = transitionEnd()

    if (!$.support.transition) return

    $.event.special.bsTransitionEnd = {
      bindType: $.support.transition.end,
      delegateType: $.support.transition.end,
      handle: function (e) {
        if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
      }
    }
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: alert.js v3.2.0
 * http://getbootstrap.com/javascript/#alerts
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // ALERT CLASS DEFINITION
  // ======================

  var dismiss = '[data-dismiss="alert"]'
  var Alert   = function (el) {
    $(el).on('click', dismiss, this.close)
  }

  Alert.VERSION = '3.2.0'

  Alert.prototype.close = function (e) {
    var $this    = $(this)
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = $(selector)

    if (e) e.preventDefault()

    if (!$parent.length) {
      $parent = $this.hasClass('alert') ? $this : $this.parent()
    }

    $parent.trigger(e = $.Event('close.bs.alert'))

    if (e.isDefaultPrevented()) return

    $parent.removeClass('in')

    function removeElement() {
      // detach from parent, fire event then clean up data
      $parent.detach().trigger('closed.bs.alert').remove()
    }

    $.support.transition && $parent.hasClass('fade') ?
      $parent
        .one('bsTransitionEnd', removeElement)
        .emulateTransitionEnd(150) :
      removeElement()
  }


  // ALERT PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.alert')

      if (!data) $this.data('bs.alert', (data = new Alert(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.alert

  $.fn.alert             = Plugin
  $.fn.alert.Constructor = Alert


  // ALERT NO CONFLICT
  // =================

  $.fn.alert.noConflict = function () {
    $.fn.alert = old
    return this
  }


  // ALERT DATA-API
  // ==============

  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)

}(jQuery);

/* ========================================================================
 * Bootstrap: button.js v3.2.0
 * http://getbootstrap.com/javascript/#buttons
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // BUTTON PUBLIC CLASS DEFINITION
  // ==============================

  var Button = function (element, options) {
    this.$element  = $(element)
    this.options   = $.extend({}, Button.DEFAULTS, options)
    this.isLoading = false
  }

  Button.VERSION  = '3.2.0'

  Button.DEFAULTS = {
    loadingText: 'loading...'
  }

  Button.prototype.setState = function (state) {
    var d    = 'disabled'
    var $el  = this.$element
    var val  = $el.is('input') ? 'val' : 'html'
    var data = $el.data()

    state = state + 'Text'

    if (data.resetText == null) $el.data('resetText', $el[val]())

    $el[val](data[state] == null ? this.options[state] : data[state])

    // push to event loop to allow forms to submit
    setTimeout($.proxy(function () {
      if (state == 'loadingText') {
        this.isLoading = true
        $el.addClass(d).attr(d, d)
      } else if (this.isLoading) {
        this.isLoading = false
        $el.removeClass(d).removeAttr(d)
      }
    }, this), 0)
  }

  Button.prototype.toggle = function () {
    var changed = true
    var $parent = this.$element.closest('[data-toggle="buttons"]')

    if ($parent.length) {
      var $input = this.$element.find('input')
      if ($input.prop('type') == 'radio') {
        if ($input.prop('checked') && this.$element.hasClass('active')) changed = false
        else $parent.find('.active').removeClass('active')
      }
      if (changed) $input.prop('checked', !this.$element.hasClass('active')).trigger('change')
    }

    if (changed) this.$element.toggleClass('active')
  }


  // BUTTON PLUGIN DEFINITION
  // ========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.button')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.button', (data = new Button(this, options)))

      if (option == 'toggle') data.toggle()
      else if (option) data.setState(option)
    })
  }

  var old = $.fn.button

  $.fn.button             = Plugin
  $.fn.button.Constructor = Button


  // BUTTON NO CONFLICT
  // ==================

  $.fn.button.noConflict = function () {
    $.fn.button = old
    return this
  }


  // BUTTON DATA-API
  // ===============

  $(document).on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
    var $btn = $(e.target)
    if (!$btn.hasClass('btn')) $btn = $btn.closest('.btn')
    Plugin.call($btn, 'toggle')
    e.preventDefault()
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: carousel.js v3.2.0
 * http://getbootstrap.com/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // CAROUSEL CLASS DEFINITION
  // =========================

  var Carousel = function (element, options) {
    this.$element    = $(element).on('keydown.bs.carousel', $.proxy(this.keydown, this))
    this.$indicators = this.$element.find('.carousel-indicators')
    this.options     = options
    this.paused      =
    this.sliding     =
    this.interval    =
    this.$active     =
    this.$items      = null

    this.options.pause == 'hover' && this.$element
      .on('mouseenter.bs.carousel', $.proxy(this.pause, this))
      .on('mouseleave.bs.carousel', $.proxy(this.cycle, this))
  }

  Carousel.VERSION  = '3.2.0'

  Carousel.DEFAULTS = {
    interval: 5000,
    pause: 'hover',
    wrap: true
  }

  Carousel.prototype.keydown = function (e) {
    switch (e.which) {
      case 37: this.prev(); break
      case 39: this.next(); break
      default: return
    }

    e.preventDefault()
  }

  Carousel.prototype.cycle = function (e) {
    e || (this.paused = false)

    this.interval && clearInterval(this.interval)

    this.options.interval
      && !this.paused
      && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

    return this
  }

  Carousel.prototype.getItemIndex = function (item) {
    this.$items = item.parent().children('.item')
    return this.$items.index(item || this.$active)
  }

  Carousel.prototype.to = function (pos) {
    var that        = this
    var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'))

    if (pos > (this.$items.length - 1) || pos < 0) return

    if (this.sliding)       return this.$element.one('slid.bs.carousel', function () { that.to(pos) }) // yes, "slid"
    if (activeIndex == pos) return this.pause().cycle()

    return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]))
  }

  Carousel.prototype.pause = function (e) {
    e || (this.paused = true)

    if (this.$element.find('.next, .prev').length && $.support.transition) {
      this.$element.trigger($.support.transition.end)
      this.cycle(true)
    }

    this.interval = clearInterval(this.interval)

    return this
  }

  Carousel.prototype.next = function () {
    if (this.sliding) return
    return this.slide('next')
  }

  Carousel.prototype.prev = function () {
    if (this.sliding) return
    return this.slide('prev')
  }

  Carousel.prototype.slide = function (type, next) {
    var $active   = this.$element.find('.item.active')
    var $next     = next || $active[type]()
    var isCycling = this.interval
    var direction = type == 'next' ? 'left' : 'right'
    var fallback  = type == 'next' ? 'first' : 'last'
    var that      = this

    if (!$next.length) {
      if (!this.options.wrap) return
      $next = this.$element.find('.item')[fallback]()
    }

    if ($next.hasClass('active')) return (this.sliding = false)

    var relatedTarget = $next[0]
    var slideEvent = $.Event('slide.bs.carousel', {
      relatedTarget: relatedTarget,
      direction: direction
    })
    this.$element.trigger(slideEvent)
    if (slideEvent.isDefaultPrevented()) return

    this.sliding = true

    isCycling && this.pause()

    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active')
      var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)])
      $nextIndicator && $nextIndicator.addClass('active')
    }

    var slidEvent = $.Event('slid.bs.carousel', { relatedTarget: relatedTarget, direction: direction }) // yes, "slid"
    if ($.support.transition && this.$element.hasClass('slide')) {
      $next.addClass(type)
      $next[0].offsetWidth // force reflow
      $active.addClass(direction)
      $next.addClass(direction)
      $active
        .one('bsTransitionEnd', function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () {
            that.$element.trigger(slidEvent)
          }, 0)
        })
        .emulateTransitionEnd($active.css('transition-duration').slice(0, -1) * 1000)
    } else {
      $active.removeClass('active')
      $next.addClass('active')
      this.sliding = false
      this.$element.trigger(slidEvent)
    }

    isCycling && this.cycle()

    return this
  }


  // CAROUSEL PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.carousel')
      var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
      var action  = typeof option == 'string' ? option : options.slide

      if (!data) $this.data('bs.carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (action) data[action]()
      else if (options.interval) data.pause().cycle()
    })
  }

  var old = $.fn.carousel

  $.fn.carousel             = Plugin
  $.fn.carousel.Constructor = Carousel


  // CAROUSEL NO CONFLICT
  // ====================

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old
    return this
  }


  // CAROUSEL DATA-API
  // =================

  $(document).on('click.bs.carousel.data-api', '[data-slide], [data-slide-to]', function (e) {
    var href
    var $this   = $(this)
    var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
    if (!$target.hasClass('carousel')) return
    var options = $.extend({}, $target.data(), $this.data())
    var slideIndex = $this.attr('data-slide-to')
    if (slideIndex) options.interval = false

    Plugin.call($target, options)

    if (slideIndex) {
      $target.data('bs.carousel').to(slideIndex)
    }

    e.preventDefault()
  })

  $(window).on('load', function () {
    $('[data-ride="carousel"]').each(function () {
      var $carousel = $(this)
      Plugin.call($carousel, $carousel.data())
    })
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: collapse.js v3.2.0
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = function (element, options) {
    this.$element      = $(element)
    this.options       = $.extend({}, Collapse.DEFAULTS, options)
    this.transitioning = null

    if (this.options.parent) this.$parent = $(this.options.parent)
    if (this.options.toggle) this.toggle()
  }

  Collapse.VERSION  = '3.2.0'

  Collapse.DEFAULTS = {
    toggle: true
  }

  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width')
    return hasWidth ? 'width' : 'height'
  }

  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in')) return

    var startEvent = $.Event('show.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var actives = this.$parent && this.$parent.find('> .panel > .in')

    if (actives && actives.length) {
      var hasData = actives.data('bs.collapse')
      if (hasData && hasData.transitioning) return
      Plugin.call(actives, 'hide')
      hasData || actives.data('bs.collapse', null)
    }

    var dimension = this.dimension()

    this.$element
      .removeClass('collapse')
      .addClass('collapsing')[dimension](0)

    this.transitioning = 1

    var complete = function () {
      this.$element
        .removeClass('collapsing')
        .addClass('collapse in')[dimension]('')
      this.transitioning = 0
      this.$element
        .trigger('shown.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    var scrollSize = $.camelCase(['scroll', dimension].join('-'))

    this.$element
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(350)[dimension](this.$element[0][scrollSize])
  }

  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in')) return

    var startEvent = $.Event('hide.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var dimension = this.dimension()

    this.$element[dimension](this.$element[dimension]())[0].offsetHeight

    this.$element
      .addClass('collapsing')
      .removeClass('collapse')
      .removeClass('in')

    this.transitioning = 1

    var complete = function () {
      this.transitioning = 0
      this.$element
        .trigger('hidden.bs.collapse')
        .removeClass('collapsing')
        .addClass('collapse')
    }

    if (!$.support.transition) return complete.call(this)

    this.$element
      [dimension](0)
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(350)
  }

  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']()
  }


  // COLLAPSE PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.collapse')
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data && options.toggle && option == 'show') option = !option
      if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.collapse

  $.fn.collapse             = Plugin
  $.fn.collapse.Constructor = Collapse


  // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


  // COLLAPSE DATA-API
  // =================

  $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
    var href
    var $this   = $(this)
    var target  = $this.attr('data-target')
        || e.preventDefault()
        || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7
    var $target = $(target)
    var data    = $target.data('bs.collapse')
    var option  = data ? 'toggle' : $this.data()
    var parent  = $this.attr('data-parent')
    var $parent = parent && $(parent)

    if (!data || !data.transitioning) {
      if ($parent) $parent.find('[data-toggle="collapse"][data-parent="' + parent + '"]').not($this).addClass('collapsed')
      $this[$target.hasClass('in') ? 'addClass' : 'removeClass']('collapsed')
    }

    Plugin.call($target, option)
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: dropdown.js v3.2.0
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop'
  var toggle   = '[data-toggle="dropdown"]'
  var Dropdown = function (element) {
    $(element).on('click.bs.dropdown', this.toggle)
  }

  Dropdown.VERSION = '3.2.0'

  Dropdown.prototype.toggle = function (e) {
    var $this = $(this)

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    clearMenus()

    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we use a backdrop because click events don't delegate
        $('<div class="dropdown-backdrop"/>').insertAfter($(this)).on('click', clearMenus)
      }

      var relatedTarget = { relatedTarget: this }
      $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this.trigger('focus')

      $parent
        .toggleClass('open')
        .trigger('shown.bs.dropdown', relatedTarget)
    }

    return false
  }

  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27)/.test(e.keyCode)) return

    var $this = $(this)

    e.preventDefault()
    e.stopPropagation()

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    if (!isActive || (isActive && e.keyCode == 27)) {
      if (e.which == 27) $parent.find(toggle).trigger('focus')
      return $this.trigger('click')
    }

    var desc = ' li:not(.divider):visible a'
    var $items = $parent.find('[role="menu"]' + desc + ', [role="listbox"]' + desc)

    if (!$items.length) return

    var index = $items.index($items.filter(':focus'))

    if (e.keyCode == 38 && index > 0)                 index--                        // up
    if (e.keyCode == 40 && index < $items.length - 1) index++                        // down
    if (!~index)                                      index = 0

    $items.eq(index).trigger('focus')
  }

  function clearMenus(e) {
    if (e && e.which === 3) return
    $(backdrop).remove()
    $(toggle).each(function () {
      var $parent = getParent($(this))
      var relatedTarget = { relatedTarget: this }
      if (!$parent.hasClass('open')) return
      $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))
      if (e.isDefaultPrevented()) return
      $parent.removeClass('open').trigger('hidden.bs.dropdown', relatedTarget)
    })
  }

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = selector && $(selector)

    return $parent && $parent.length ? $parent : $this.parent()
  }


  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.dropdown')

      if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.dropdown

  $.fn.dropdown             = Plugin
  $.fn.dropdown.Constructor = Dropdown


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old
    return this
  }


  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================

  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
    .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
    .on('keydown.bs.dropdown.data-api', toggle + ', [role="menu"], [role="listbox"]', Dropdown.prototype.keydown)

}(jQuery);

/* ========================================================================
 * Bootstrap: modal.js v3.2.0
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options        = options
    this.$body          = $(document.body)
    this.$element       = $(element)
    this.$backdrop      =
    this.isShown        = null
    this.scrollbarWidth = 0

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.VERSION  = '3.2.0'

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.checkScrollbar()
    this.$body.addClass('modal-open')

    this.setScrollbar()
    this.escape()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element
        .addClass('in')
        .attr('aria-hidden', false)

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$element.find('.modal-dialog') // wait for modal to slide in
          .one('bsTransitionEnd', function () {
            that.$element.trigger('focus').trigger(e)
          })
          .emulateTransitionEnd(300) :
        that.$element.trigger('focus').trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.$body.removeClass('modal-open')

    this.resetScrollbar()
    this.escape()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .attr('aria-hidden', true)
      .off('click.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(300) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
          this.$element.trigger('focus')
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keyup.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keyup.dismiss.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
        .appendTo(this.$body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus.call(this.$element[0])
          : this.hide.call(this)
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one('bsTransitionEnd', callback)
          .emulateTransitionEnd(150) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      var callbackRemove = function () {
        that.removeBackdrop()
        callback && callback()
      }
      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one('bsTransitionEnd', callbackRemove)
          .emulateTransitionEnd(150) :
        callbackRemove()

    } else if (callback) {
      callback()
    }
  }

  Modal.prototype.checkScrollbar = function () {
    if (document.body.clientWidth >= window.innerWidth) return
    this.scrollbarWidth = this.scrollbarWidth || this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
    if (this.scrollbarWidth) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
  }

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', '')
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
    var scrollDiv = document.createElement('div')
    scrollDiv.className = 'modal-scrollbar-measure'
    this.$body.append(scrollDiv)
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    this.$body[0].removeChild(scrollDiv)
    return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal             = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
    var option  = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: tooltip.js v3.2.0
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
    this.type       =
    this.options    =
    this.enabled    =
    this.timeout    =
    this.hoverState =
    this.$element   = null

    this.init('tooltip', element, options)
  }

  Tooltip.VERSION  = '3.2.0'

  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false,
    viewport: {
      selector: 'body',
      padding: 0
    }
  }

  Tooltip.prototype.init = function (type, element, options) {
    this.enabled   = true
    this.type      = type
    this.$element  = $(element)
    this.options   = this.getOptions(options)
    this.$viewport = this.options.viewport && $(this.options.viewport.selector || this.options.viewport)

    var triggers = this.options.trigger.split(' ')

    for (var i = triggers.length; i--;) {
      var trigger = triggers[i]

      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
      } else if (trigger != 'manual') {
        var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focusin'
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

        this.$element.on(eventIn  + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
      }
    }

    this.options.selector ?
      (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
      this.fixTitle()
  }

  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS
  }

  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options)

    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      }
    }

    return options
  }

  Tooltip.prototype.getDelegateOptions = function () {
    var options  = {}
    var defaults = this.getDefaults()

    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value) options[key] = value
    })

    return options
  }

  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    clearTimeout(self.timeout)

    self.hoverState = 'in'

    if (!self.options.delay || !self.options.delay.show) return self.show()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in') self.show()
    }, self.options.delay.show)
  }

  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    clearTimeout(self.timeout)

    self.hoverState = 'out'

    if (!self.options.delay || !self.options.delay.hide) return self.hide()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out') self.hide()
    }, self.options.delay.hide)
  }

  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type)

    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e)

      var inDom = $.contains(document.documentElement, this.$element[0])
      if (e.isDefaultPrevented() || !inDom) return
      var that = this

      var $tip = this.tip()

      var tipId = this.getUID(this.type)

      this.setContent()
      $tip.attr('id', tipId)
      this.$element.attr('aria-describedby', tipId)

      if (this.options.animation) $tip.addClass('fade')

      var placement = typeof this.options.placement == 'function' ?
        this.options.placement.call(this, $tip[0], this.$element[0]) :
        this.options.placement

      var autoToken = /\s?auto?\s?/i
      var autoPlace = autoToken.test(placement)
      if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

      $tip
        .detach()
        .css({ top: 0, left: 0, display: 'block' })
        .addClass(placement)
        .data('bs.' + this.type, this)

      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)

      var pos          = this.getPosition()
      var actualWidth  = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (autoPlace) {
        var orgPlacement = placement
        var $parent      = this.$element.parent()
        var parentDim    = this.getPosition($parent)

        placement = placement == 'bottom' && pos.top   + pos.height       + actualHeight - parentDim.scroll > parentDim.height ? 'top'    :
                    placement == 'top'    && pos.top   - parentDim.scroll - actualHeight < 0                                   ? 'bottom' :
                    placement == 'right'  && pos.right + actualWidth      > parentDim.width                                    ? 'left'   :
                    placement == 'left'   && pos.left  - actualWidth      < parentDim.left                                     ? 'right'  :
                    placement

        $tip
          .removeClass(orgPlacement)
          .addClass(placement)
      }

      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

      this.applyPlacement(calculatedOffset, placement)

      var complete = function () {
        that.$element.trigger('shown.bs.' + that.type)
        that.hoverState = null
      }

      $.support.transition && this.$tip.hasClass('fade') ?
        $tip
          .one('bsTransitionEnd', complete)
          .emulateTransitionEnd(150) :
        complete()
    }
  }

  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var $tip   = this.tip()
    var width  = $tip[0].offsetWidth
    var height = $tip[0].offsetHeight

    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10)
    var marginLeft = parseInt($tip.css('margin-left'), 10)

    // we must check for NaN for ie 8/9
    if (isNaN(marginTop))  marginTop  = 0
    if (isNaN(marginLeft)) marginLeft = 0

    offset.top  = offset.top  + marginTop
    offset.left = offset.left + marginLeft

    // $.fn.offset doesn't round pixel values
    // so we use setOffset directly with our own function B-0
    $.offset.setOffset($tip[0], $.extend({
      using: function (props) {
        $tip.css({
          top: Math.round(props.top),
          left: Math.round(props.left)
        })
      }
    }, offset), 0)

    $tip.addClass('in')

    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth  = $tip[0].offsetWidth
    var actualHeight = $tip[0].offsetHeight

    if (placement == 'top' && actualHeight != height) {
      offset.top = offset.top + height - actualHeight
    }

    var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

    if (delta.left) offset.left += delta.left
    else offset.top += delta.top

    var arrowDelta          = delta.left ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
    var arrowPosition       = delta.left ? 'left'        : 'top'
    var arrowOffsetPosition = delta.left ? 'offsetWidth' : 'offsetHeight'

    $tip.offset(offset)
    this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], arrowPosition)
  }

  Tooltip.prototype.replaceArrow = function (delta, dimension, position) {
    this.arrow().css(position, delta ? (50 * (1 - delta / dimension) + '%') : '')
  }

  Tooltip.prototype.setContent = function () {
    var $tip  = this.tip()
    var title = this.getTitle()

    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
    $tip.removeClass('fade in top bottom left right')
  }

  Tooltip.prototype.hide = function () {
    var that = this
    var $tip = this.tip()
    var e    = $.Event('hide.bs.' + this.type)

    this.$element.removeAttr('aria-describedby')

    function complete() {
      if (that.hoverState != 'in') $tip.detach()
      that.$element.trigger('hidden.bs.' + that.type)
    }

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    $tip.removeClass('in')

    $.support.transition && this.$tip.hasClass('fade') ?
      $tip
        .one('bsTransitionEnd', complete)
        .emulateTransitionEnd(150) :
      complete()

    this.hoverState = null

    return this
  }

  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element
    if ($e.attr('title') || typeof ($e.attr('data-original-title')) != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
    }
  }

  Tooltip.prototype.hasContent = function () {
    return this.getTitle()
  }

  Tooltip.prototype.getPosition = function ($element) {
    $element   = $element || this.$element
    var el     = $element[0]
    var isBody = el.tagName == 'BODY'
    return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : null, {
      scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop(),
      width:  isBody ? $(window).width()  : $element.outerWidth(),
      height: isBody ? $(window).height() : $element.outerHeight()
    }, isBody ? { top: 0, left: 0 } : $element.offset())
  }

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2  } :
           placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2  } :
           placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
        /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width   }

  }

  Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
    var delta = { top: 0, left: 0 }
    if (!this.$viewport) return delta

    var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
    var viewportDimensions = this.getPosition(this.$viewport)

    if (/right|left/.test(placement)) {
      var topEdgeOffset    = pos.top - viewportPadding - viewportDimensions.scroll
      var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
      if (topEdgeOffset < viewportDimensions.top) { // top overflow
        delta.top = viewportDimensions.top - topEdgeOffset
      } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
        delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
      }
    } else {
      var leftEdgeOffset  = pos.left - viewportPadding
      var rightEdgeOffset = pos.left + viewportPadding + actualWidth
      if (leftEdgeOffset < viewportDimensions.left) { // left overflow
        delta.left = viewportDimensions.left - leftEdgeOffset
      } else if (rightEdgeOffset > viewportDimensions.width) { // right overflow
        delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
      }
    }

    return delta
  }

  Tooltip.prototype.getTitle = function () {
    var title
    var $e = this.$element
    var o  = this.options

    title = $e.attr('data-original-title')
      || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

    return title
  }

  Tooltip.prototype.getUID = function (prefix) {
    do prefix += ~~(Math.random() * 1000000)
    while (document.getElementById(prefix))
    return prefix
  }

  Tooltip.prototype.tip = function () {
    return (this.$tip = this.$tip || $(this.options.template))
  }

  Tooltip.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
  }

  Tooltip.prototype.validate = function () {
    if (!this.$element[0].parentNode) {
      this.hide()
      this.$element = null
      this.options  = null
    }
  }

  Tooltip.prototype.enable = function () {
    this.enabled = true
  }

  Tooltip.prototype.disable = function () {
    this.enabled = false
  }

  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled
  }

  Tooltip.prototype.toggle = function (e) {
    var self = this
    if (e) {
      self = $(e.currentTarget).data('bs.' + this.type)
      if (!self) {
        self = new this.constructor(e.currentTarget, this.getDelegateOptions())
        $(e.currentTarget).data('bs.' + this.type, self)
      }
    }

    self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
  }

  Tooltip.prototype.destroy = function () {
    clearTimeout(this.timeout)
    this.hide().$element.off('.' + this.type).removeData('bs.' + this.type)
  }


  // TOOLTIP PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.tooltip')
      var options = typeof option == 'object' && option

      if (!data && option == 'destroy') return
      if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tooltip

  $.fn.tooltip             = Plugin
  $.fn.tooltip.Constructor = Tooltip


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old
    return this
  }

}(jQuery);

/* ========================================================================
 * Bootstrap: popover.js v3.2.0
 * http://getbootstrap.com/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = function (element, options) {
    this.init('popover', element, options)
  }

  if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js')

  Popover.VERSION  = '3.2.0'

  Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  })


  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

  Popover.prototype.constructor = Popover

  Popover.prototype.getDefaults = function () {
    return Popover.DEFAULTS
  }

  Popover.prototype.setContent = function () {
    var $tip    = this.tip()
    var title   = this.getTitle()
    var content = this.getContent()

    $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
    $tip.find('.popover-content').empty()[ // we use append for html objects to maintain js events
      this.options.html ? (typeof content == 'string' ? 'html' : 'append') : 'text'
    ](content)

    $tip.removeClass('fade top bottom left right in')

    // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.
    if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
  }

  Popover.prototype.hasContent = function () {
    return this.getTitle() || this.getContent()
  }

  Popover.prototype.getContent = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-content')
      || (typeof o.content == 'function' ?
            o.content.call($e[0]) :
            o.content)
  }

  Popover.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
  }

  Popover.prototype.tip = function () {
    if (!this.$tip) this.$tip = $(this.options.template)
    return this.$tip
  }


  // POPOVER PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.popover')
      var options = typeof option == 'object' && option

      if (!data && option == 'destroy') return
      if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.popover

  $.fn.popover             = Plugin
  $.fn.popover.Constructor = Popover


  // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
    $.fn.popover = old
    return this
  }

}(jQuery);

/* ========================================================================
 * Bootstrap: scrollspy.js v3.2.0
 * http://getbootstrap.com/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // SCROLLSPY CLASS DEFINITION
  // ==========================

  function ScrollSpy(element, options) {
    var process  = $.proxy(this.process, this)

    this.$body          = $('body')
    this.$scrollElement = $(element).is('body') ? $(window) : $(element)
    this.options        = $.extend({}, ScrollSpy.DEFAULTS, options)
    this.selector       = (this.options.target || '') + ' .nav li > a'
    this.offsets        = []
    this.targets        = []
    this.activeTarget   = null
    this.scrollHeight   = 0

    this.$scrollElement.on('scroll.bs.scrollspy', process)
    this.refresh()
    this.process()
  }

  ScrollSpy.VERSION  = '3.2.0'

  ScrollSpy.DEFAULTS = {
    offset: 10
  }

  ScrollSpy.prototype.getScrollHeight = function () {
    return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight)
  }

  ScrollSpy.prototype.refresh = function () {
    var offsetMethod = 'offset'
    var offsetBase   = 0

    if (!$.isWindow(this.$scrollElement[0])) {
      offsetMethod = 'position'
      offsetBase   = this.$scrollElement.scrollTop()
    }

    this.offsets = []
    this.targets = []
    this.scrollHeight = this.getScrollHeight()

    var self     = this

    this.$body
      .find(this.selector)
      .map(function () {
        var $el   = $(this)
        var href  = $el.data('target') || $el.attr('href')
        var $href = /^#./.test(href) && $(href)

        return ($href
          && $href.length
          && $href.is(':visible')
          && [[$href[offsetMethod]().top + offsetBase, href]]) || null
      })
      .sort(function (a, b) { return a[0] - b[0] })
      .each(function () {
        self.offsets.push(this[0])
        self.targets.push(this[1])
      })
  }

  ScrollSpy.prototype.process = function () {
    var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset
    var scrollHeight = this.getScrollHeight()
    var maxScroll    = this.options.offset + scrollHeight - this.$scrollElement.height()
    var offsets      = this.offsets
    var targets      = this.targets
    var activeTarget = this.activeTarget
    var i

    if (this.scrollHeight != scrollHeight) {
      this.refresh()
    }

    if (scrollTop >= maxScroll) {
      return activeTarget != (i = targets[targets.length - 1]) && this.activate(i)
    }

    if (activeTarget && scrollTop <= offsets[0]) {
      return activeTarget != (i = targets[0]) && this.activate(i)
    }

    for (i = offsets.length; i--;) {
      activeTarget != targets[i]
        && scrollTop >= offsets[i]
        && (!offsets[i + 1] || scrollTop <= offsets[i + 1])
        && this.activate(targets[i])
    }
  }

  ScrollSpy.prototype.activate = function (target) {
    this.activeTarget = target

    $(this.selector)
      .parentsUntil(this.options.target, '.active')
      .removeClass('active')

    var selector = this.selector +
        '[data-target="' + target + '"],' +
        this.selector + '[href="' + target + '"]'

    var active = $(selector)
      .parents('li')
      .addClass('active')

    if (active.parent('.dropdown-menu').length) {
      active = active
        .closest('li.dropdown')
        .addClass('active')
    }

    active.trigger('activate.bs.scrollspy')
  }


  // SCROLLSPY PLUGIN DEFINITION
  // ===========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.scrollspy')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.scrollspy

  $.fn.scrollspy             = Plugin
  $.fn.scrollspy.Constructor = ScrollSpy


  // SCROLLSPY NO CONFLICT
  // =====================

  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old
    return this
  }


  // SCROLLSPY DATA-API
  // ==================

  $(window).on('load.bs.scrollspy.data-api', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this)
      Plugin.call($spy, $spy.data())
    })
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: tab.js v3.2.0
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    this.element = $(element)
  }

  Tab.VERSION = '3.2.0'

  Tab.prototype.show = function () {
    var $this    = this.element
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    var selector = $this.data('target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return

    var previous = $ul.find('.active:last a')[0]
    var e        = $.Event('show.bs.tab', {
      relatedTarget: previous
    })

    $this.trigger(e)

    if (e.isDefaultPrevented()) return

    var $target = $(selector)

    this.activate($this.closest('li'), $ul)
    this.activate($target, $target.parent(), function () {
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: previous
      })
    })
  }

  Tab.prototype.activate = function (element, container, callback) {
    var $active    = container.find('> .active')
    var transition = callback
      && $.support.transition
      && $active.hasClass('fade')

    function next() {
      $active
        .removeClass('active')
        .find('> .dropdown-menu > .active')
        .removeClass('active')

      element.addClass('active')

      if (transition) {
        element[0].offsetWidth // reflow for transition
        element.addClass('in')
      } else {
        element.removeClass('fade')
      }

      if (element.parent('.dropdown-menu')) {
        element.closest('li.dropdown').addClass('active')
      }

      callback && callback()
    }

    transition ?
      $active
        .one('bsTransitionEnd', next)
        .emulateTransitionEnd(150) :
      next()

    $active.removeClass('in')
  }


  // TAB PLUGIN DEFINITION
  // =====================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tab

  $.fn.tab             = Plugin
  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  $(document).on('click.bs.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
    e.preventDefault()
    Plugin.call($(this), 'show')
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: affix.js v3.2.0
 * http://getbootstrap.com/javascript/#affix
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  

  // AFFIX CLASS DEFINITION
  // ======================

  var Affix = function (element, options) {
    this.options = $.extend({}, Affix.DEFAULTS, options)

    this.$target = $(this.options.target)
      .on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))
      .on('click.bs.affix.data-api',  $.proxy(this.checkPositionWithEventLoop, this))

    this.$element     = $(element)
    this.affixed      =
    this.unpin        =
    this.pinnedOffset = null

    this.checkPosition()
  }

  Affix.VERSION  = '3.2.0'

  Affix.RESET    = 'affix affix-top affix-bottom'

  Affix.DEFAULTS = {
    offset: 0,
    target: window
  }

  Affix.prototype.getPinnedOffset = function () {
    if (this.pinnedOffset) return this.pinnedOffset
    this.$element.removeClass(Affix.RESET).addClass('affix')
    var scrollTop = this.$target.scrollTop()
    var position  = this.$element.offset()
    return (this.pinnedOffset = position.top - scrollTop)
  }

  Affix.prototype.checkPositionWithEventLoop = function () {
    setTimeout($.proxy(this.checkPosition, this), 1)
  }

  Affix.prototype.checkPosition = function () {
    if (!this.$element.is(':visible')) return

    var scrollHeight = $(document).height()
    var scrollTop    = this.$target.scrollTop()
    var position     = this.$element.offset()
    var offset       = this.options.offset
    var offsetTop    = offset.top
    var offsetBottom = offset.bottom

    if (typeof offset != 'object')         offsetBottom = offsetTop = offset
    if (typeof offsetTop == 'function')    offsetTop    = offset.top(this.$element)
    if (typeof offsetBottom == 'function') offsetBottom = offset.bottom(this.$element)

    var affix = this.unpin   != null && (scrollTop + this.unpin <= position.top) ? false :
                offsetBottom != null && (position.top + this.$element.height() >= scrollHeight - offsetBottom) ? 'bottom' :
                offsetTop    != null && (scrollTop <= offsetTop) ? 'top' : false

    if (this.affixed === affix) return
    if (this.unpin != null) this.$element.css('top', '')

    var affixType = 'affix' + (affix ? '-' + affix : '')
    var e         = $.Event(affixType + '.bs.affix')

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    this.affixed = affix
    this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null

    this.$element
      .removeClass(Affix.RESET)
      .addClass(affixType)
      .trigger($.Event(affixType.replace('affix', 'affixed')))

    if (affix == 'bottom') {
      this.$element.offset({
        top: scrollHeight - this.$element.height() - offsetBottom
      })
    }
  }


  // AFFIX PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.affix')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.affix

  $.fn.affix             = Plugin
  $.fn.affix.Constructor = Affix


  // AFFIX NO CONFLICT
  // =================

  $.fn.affix.noConflict = function () {
    $.fn.affix = old
    return this
  }


  // AFFIX DATA-API
  // ==============

  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this)
      var data = $spy.data()

      data.offset = data.offset || {}

      if (data.offsetBottom) data.offset.bottom = data.offsetBottom
      if (data.offsetTop)    data.offset.top    = data.offsetTop

      Plugin.call($spy, data)
    })
  })

}(jQuery);

define("bootstrap", function(){});

define('column-data/registry',[
  "ember",
], function(Ember) {

return Ember.Object.create({
  map : {},

  store : function(name, parent, columnData) {
    this.get("map")[parent+":"+name] = columnData;
  },

  retrieve : function(name, parent) {
    return this.get("map")[parent+":"+name];
  },
});

});

define('column-data/validations/emptyValidation',[
  "ember",
], function() {


/**
 * Not empty validation class. Pass type = 0 to get this.
 *
 * @class EmptyValidation
 * @module column-data
 * @submodule column-data-validation
 */
var EmptyValidation = Ember.Object.extend({
  /**
   * Message to show when the validation fails.
   *
   * @property invalidMessage
   * @type String
   */
  invalidMessage : "",

  /**
   * Boolean that says whether to negate the result or not.
   *
   * @property negate
   * @type Boolean
   */
  negate : false,

  validateValue : function(value, record) {
    var invalid = Ember.isEmpty(value) || /^\s*$/.test(value),
        negate = this.get("negate");
    invalid = (negate && !invalid) || (!negate && invalid);
    return [invalid, this.get("invalidMessage")];
  },

  canBeEmpty : false,
});

return EmptyValidation;

});

define('column-data/validations/regexValidation',[
  "ember",
  "./emptyValidation",
], function(Ember, EmptyValidation) {

/**
 * Validate on a regex. Pass type = 1 to get this.
 *
 * @class RegexValidation
 * @module column-data
 * @submodule column-data-validation
 */
var RegexValidation = EmptyValidation.extend({
  /**
   * Regex to valide with.
   *
   * @property regex
   * @type String
   */
  regex : "",

  /**
   * Regex flags to use while creating the regex object.
   *
   * @property regexFlags
   * @type String
   */
  regexFlags : "",

  /**
   * RegExp object create using regex and regexFlags.
   *
   * @property regexObject
   * @type RegExp
   */
  regexObject : function() {
    return new RegExp(this.get("regex"), this.get("regexFlags"));
  }.property('regex'),

  /**
   * Method to validate.
   *
   * @method validateValue
   * @param {any} value Value to validate.
   * @param {Class} record Record to validate on.
   * @returns {Boolean}
   * @private
   */
  validateValue : function(value, record) {
    var invalid = false, negate = this.get("negate"),
        isEmpty, emptyBool;
    if(value && value.trim) value = value.trim();
    isEmpty = Ember.isEmpty(value);
    emptyBool = (this.get("canBeEmpty") && negate) || (!this.get("canBeEmpty") && !negate);
    invalid = (isEmpty && emptyBool) || this.get("regexObject").test(value);
    invalid = (negate && !invalid) || (!negate && invalid);
    return [invalid, this.get("invalidMessage")];
  },
});

return RegexValidation;

});

define('column-data/validations/csvRegexValidation',[
  "ember",
  "./regexValidation",
], function(Ember, RegexValidation) {

/**
 * Validate on a regex on each value in a Comma Seperated Value. Pass type = 2 to get this.
 *
 * @class CSVRegexValidation
 * @module column-data
 * @submodule column-data-validation
 */
var CSVRegexValidation = RegexValidation.extend({
  /**
   * Delimeter to use to split values in the CSV.
   *
   * @property delimeter
   * @type String
   */
  delimeter : ",",

  validateValue : function(value, record) {
    var invalid = false, negate = this.get("negate"),
        isEmpty, emptyBool;
    if(value && value.trim) value = value.trim();
    isEmpty = Ember.isEmpty(value);
    if(!isEmpty) {
      value.split(this.get("delimeter")).some(function(item) { 
        item = item.trim();
        invalid = this.get("regexObject").test(item); 
        return negate ? !invalid : invalid; 
      }, this); 
      invalid = (negate && !invalid) || (!negate && invalid);
    }
    return [invalid, this.get("invalidMessage")];
  },
});

return CSVRegexValidation;

});

define('column-data/validations/csvDuplicateValidation',[
  "ember",
  "./csvRegexValidation",
], function(Ember, CSVRegexValidation) {


/**
 * Validate duplication in a CSV. Pass type = 3 to get this.
 *
 * @class CSVDuplicateValidation
 * @module column-data
 * @submodule column-data-validation
 */
var CSVDuplicateValidation = CSVRegexValidation.extend({
  validateValue : function(value, record) {
    var invalid = false, negate = this.get("negate"),
        isEmpty, emptyBool, valuesMap = {};
    if(value && value.trim) value = value.trim();
    isEmpty = Ember.isEmpty(value);
    if(!isEmpty) {
      value.split(this.get("delimeter")).some(function(item) { 
        item = item.trim();
        if(valuesMap[item]) {
          invalid = true;
        }
        else {
          valuesMap[item] = 1;
        }
        return negate ? !invalid : invalid; 
      }, this); 
      invalid = (negate && !invalid) || (!negate && invalid);
    }
    return [invalid, this.get("invalidMessage")];
  },
});

return CSVDuplicateValidation;

});

define('column-data/validations/duplicateAcrossRecordsValidation',[
  "ember",
  "./emptyValidation",
], function(Ember, EmptyValidation) {


/**
 * Validate duplication across siblings of the record. Pass type = 4 to get this.
 *
 * @class DuplicateAcrossRecordsValidation
 * @module column-data
 * @submodule column-data-validation
 */
var DuplicateAcrossRecordsValidation = EmptyValidation.extend({
  /**
   * Path relative to record to check duplication under.
   *
   * @property duplicateCheckPath
   * @type String
   */
  duplicateCheckPath : "",

  /**
   * Key in the object to check duplicate for.
   *
   * @property duplicateCheckKey
   * @type String
   */
  duplicateCheckKey : "id",

  validateValue : function(value, record) {
    var invalid = false, negate = this.get("negate"),
        arr = record.get(this.get("duplicateCheckPath")),
        values = arr && arr.filterBy(this.get("duplicateCheckKey"), value);
    invalid = (values && values.get("length") > 1) || (values.get("length") === 1 && values[0] !== record);
    invalid = (negate && !invalid) || (!negate && invalid);
    return [invalid, this.get("invalidMessage")];
  },
});

return DuplicateAcrossRecordsValidation;

});

define('column-data/validations/numberRangeValidation',[
  "ember",
  "./emptyValidation",
], function(Ember, EmptyValidation) {


/**
 * Validate number ranges. Pass type = 5 to get this.
 *
 * @class NumberRangeValidation
 * @module column-data
 * @submodule column-data-validation
 */
var NumberRangeValidation = EmptyValidation.extend({
  /**
   * Min value of a number.
   *
   * @property minValue
   * @type Number
   */
  minValue : 0,

  /**
   * Max value of a number.
   *
   * @property maxValue
   * @type Number
   */
  maxValue : 999999,

  validateValue : function(value, record) {
    var invalid = false, negate = this.get("negate");
    if(value && value.trim) value = value.trim();
    if(Ember.isEmpty(value)) {
      invalid = (this.get("canBeEmpty") && negate) || (!this.get("canBeEmpty") && !negate);
    }
    else {
      var num = Number(value);
      if(num < this.get("minValue") || num > this.get("maxValue")) invalid = true;
    }
    invalid = (negate && !invalid) || (!negate && invalid);
    return [invalid, this.get("invalidMessage")];
  },
});

return NumberRangeValidation;

});

define('column-data/validations/columnDataValidation',[
  "ember",
  "lib/ember-utils-core",
  "./emptyValidation",
  "./regexValidation",
  "./csvRegexValidation",
  "./csvDuplicateValidation",
  "./duplicateAcrossRecordsValidation",
  "./numberRangeValidation",
], function(Ember, Utils) { 

var ColumnDataValidationsMap = {};
for(var i = 2; i < arguments.length; i++) {
  ColumnDataValidationsMap[i - 2] = arguments[i];
}

/**
 * Validation class that goes as 'validation' on column data.
 *
 * @class ColumnDataValidation
 * @module column-data
 * @submodule column-data-validation
 */
var ColumnDataValidation = Ember.Object.extend({
  init : function() {
    this._super();
    this.canBeEmpty();
  },

  /**
   * Array of validations to run. Passed as objects while creating.
   *
   * @property validations
   * @type Array
   */
  validations : Utils.hasMany(ColumnDataValidationsMap, "type"),

  /**
   * @property validate
   * @type Boolean
   * @private
   */
  validate : Ember.computed.notEmpty('validations'),

  /**
   * Method to validate a value on record.
   *
   * @method validateValue
   * @param {any} value Value to validate.
   * @param {Class} record Record to validate on.
   * @param {Array} [validations] Optional override of the validations to run.
   * @returns {Array} Returns an array with 1st element as a boolean which says whether validations passed or not, 2nd element is the invalid message if it failed.
   */
  validateValue : function(value, record, validations) {
    var invalid = [false, ""];
    validations = validations || this.get("validations");
    for(var i = 0; i < validations.length; i++) {
      invalid = validations[i].validateValue(value, record);
      if(invalid[0]) break;
    }
    return invalid;
  },

  canBeEmpty : function() {
    if(this.get("validations") && !this.get("validations").mapBy("type").contains(0)) {
      this.set("mandatory", false);
      this.get("validations").forEach(function(item) {
        item.set('canBeEmpty', true);
      });
    }
    else {
      this.set("mandatory", true);
    }
  }.observes('validations.@each'),

  /**
   * Boolean to denote whether the property is mandatory or not.
   *
   * @property mandatory
   * @type Boolean
   */
  mandatory : false,
});

return ColumnDataValidation;

});

define('column-data/columnListenerEntry',[
  "ember",
], function(Ember) {

/**
 * Entry for column listeners.
 *
 * @class ColumnListenerEntry
 */
var ColumnListenerEntry = Ember.Object.extend({
  /**
   * A name to uniquely identify column data.
   *
   * @property name
   * @type String
   */
  name : "",

  /**
   * Key name of the attribute in the record. If not provided, 'name' is used a key.
   *
   * @property keyName
   * @type String
   */
  keyName : "",

  /**
   * Key of the attribute based on keyName or name if keyName is not provided.
   *
   * @property key
   * @type String
   * @private
   */
  key : function() {
    return this.get("keyName") || this.get("name");
  }.property("keyName", "name"),
});

return ColumnListenerEntry;

});

define('column-data/columnData',[
  "ember",
  "./registry",
  "./validations/columnDataValidation",
  "./columnListenerEntry",
  "lib/ember-utils-core",
], function(Ember, Registry, ColumnDataValidation, ColumnListenerEntry, Utils) {

/**
 * Class for meta data for a property on a record.
 *
 * @class ColumnData.ColumnData
 */
var ColumnData = Ember.Object.extend({
  init : function () {
    this._super();
    Registry.store(this.get("name"), "columnData", this);
  },

  /**
   * A name to uniquely identify column data.
   *
   * @property name
   * @type String
   */
  name : "",

  /**
   * Key name of the attribute in the record. If not provided, 'name' is used a key.
   *
   * @property keyName
   * @type String
   */
  keyName : "",

  /**
   * Key of the attribute based on keyName or name if keyName is not provided.
   *
   * @property key
   * @type String
   * @private
   */
  key : function() {
    return this.get("keyName") || this.get("name");
  }.property("keyName", "name"),

  /**
   * Meta data for the validation of the attribute on the record. Passed as an object while creating.
   *
   * @property validation
   * @type Class
   */
  validation : Utils.belongsTo(ColumnDataValidation),

  /**
   * Meta data used by list-group module. Passed as an object while creating.
   *
   * @property list
   * @type Class
   */
  list : Utils.belongsTo("ListGroup.ListColumnDataMap", "moduleType", "default", "GlobalModules.GlobalModulesColumnDataMixinMap", "viewType", "displayText"),

  /**
   * Meta data used by tree module. Passed as an object while creating.
   *
   * @property tree
   * @type Class
   */
  tree : Utils.belongsTo("Tree.TreeColumnDataMap", "moduleType", "default", "GlobalModules.GlobalModulesColumnDataMixinMap", "viewType", "displayText"),

  /**
   * Meta data used by sortable module. Passed as an object while creating.
   *
   * @property sort
   * @type Class
   */
  sort : Utils.belongsTo("DragDrop.SortableColumnDataMap", "moduleType", "default", "GlobalModules.GlobalModulesColumnDataMixinMap", "viewType", "displayText"),

  /**
   * Meta data used by panels module. Passed as an object while creating.
   *
   * @property panel
   * @type Class
   */
  panel : Utils.belongsTo("Panels.PanelColumnDataMap", "moduleType", "default", "GlobalModules.GlobalModulesColumnDataMixinMap", "viewType", "displayText"),

  /**
   * Meta data used by form module. Passed as an object while creating.
   *
   * @property form
   * @type Class
   */
  form : Utils.belongsTo("Form.FormColumnDataMap", "moduleType", "textInput"),

  /**
   * Meta data used by model module. Passed as an object while creating.
   *
   * @property model
   * @type Class
   */
  modal : Utils.belongsTo("Modal.ModalColumnDataMap", "moduleType", "default", "GlobalModules.GlobalModulesColumnDataMixinMap", "viewType", "displayText"),

  /**
   * A suitable label for the attribute used in displaying in certain places.
   *
   * @property label
   * @type String
   */
  label : null,

  /**
   * A nested child column data.
   *
   * @property childCol
   * @type Class
   * @private
   */
  childCol : Utils.belongsTo("ColumnData.ColumnData"),

  /**
   * A name for the nesting of a column data.
   *
   * @property childColName
   * @type String
   */
  childColName : function(key, value) {
    if(arguments.length > 1) {
      if(value) {
        this.set("childCol", Registry.retrieve(value, "columnData"));
      }
      return value;
    }
  }.property(),

  /**
   * A nested child column data group.
   *
   * @property childColGroup
   * @type Class
   * @private
   */
  childColGroup : Utils.belongsTo("ColumnData.ColumnDataGroup"),

  /**
   * A name for the nesting of a column data group.
   *
   * @property childColGroupName
   * @type String
   * @private
   */
  childColGroupName : function(key, value) {
    if(arguments.length > 1) {
      if(value) {
        this.set("childColGroup", Registry.retrieve(value, "columnDataGroup"));
      }
      return value;
    }
  }.property(),

  columnListenerEntries : Utils.hasMany(ColumnListenerEntry),
});

return {
  ColumnData : ColumnData,
};

});

define('column-data/columnDataGroup',[
  "ember",
  "./registry",
  "./columnData",
  "lib/ember-utils-core",
], function(Ember, Registry, ColumnData, Utils) {

/**
 * Class with meta data of a record type.
 *
 * @class ColumnData.ColumnDataGroup
 */
var ColumnDataGroup = Ember.Object.extend({
  init : function (){
    this._super();
    this.set("columns", this.get("columns") || []);
    Registry.store(this.get("name"), "columnDataGroup", this);
  },

  /**
   * A name to uniquely identify the column data group.
   *
   * @property name
   * @type String
   */
  name : "",

  /**
   * Array of columns. Each element is an object which will be passed to ColumnData.ColumnData.create.
   *
   * @property columns
   * @type Array
   */
  columns : Utils.hasMany(ColumnData.ColumnData),

  /**
   * Meta data used by list-group module. Passed as an object while creating.
   *
   * @property list
   * @type Class
   */
  list : Utils.belongsTo("ListGroup.ListColumnDataGroup"),

  /**
   * Meta data used by tree module. Passed as an object while creating.
   *
   * @property tree
   * @type Class
   */
  tree : Utils.belongsTo("Tree.TreeColumnDataGroup"),

  /**
   * Meta data used by sortable module. Passed as an object while creating.
   *
   * @property sort
   * @type Class
   */
  sort : Utils.belongsTo("DragDrop.SortableColumnDataGroup"),

  /**
   * Meta data used by panels module. Passed as an object while creating.
   *
   * @property panel
   * @type Class
   */
  panel : Utils.belongsTo("Panels.PanelColumnDataGroup"),

  /**
   * Meta data used by lazy-display module. Passed as an object while creating.
   *
   * @property lazyDisplay
   * @type Class
   */
  lazyDisplay : Utils.belongsTo("LazyDisplay.LazyDisplayColumnDataGroup"),

  /**
   * Meta data used by form module. Passed as an object while creating.
   *
   * @property form
   * @type Class
   */
  form : Utils.belongsTo("Form.FormColumnDataGroup"),

  /**
   * Meta data used by model module. Passed as an object while creating.
   *
   * @property model
   * @type Class
   */
  modal : Utils.belongsTo("Modal.ModalColumnDataGroup"),
});

return {
  ColumnDataGroup : ColumnDataGroup,
  Registry : Registry,
};

});

/**
 * Validations for property in record.
 *
 * @submodule column-data-validation
 * @module column-data
 */

define('column-data/validations/main',[
  "ember",
  "./columnDataValidation",
], function(Ember, ColumnDataValidation) {
  return {
    ColumnDataValidation : ColumnDataValidation,
  };
});

define('column-data/utils/columnDataChangeCollectorMixin',[
  "ember",
], function(Ember) {

/**
 * A mixin that is a parent of ColumnDataValueMixin that collects value changes and fires listeners on the column.
 *
 * @class ColumnDataChangeCollectorMixin
 * @module column-data
 * @submodule column-data-utils
 */
var ColumnDataChangeCollectorMixin = Ember.Mixin.create({
  init : function() {
    this._super();
    this.set("listenToMap", this.get("listenToMap") || {});
  },
  listenToMap : null,

  bubbleValChange : function(columnData, val, oldVal, callingView) {
    var listenToMap = this.get("listenToMap"), thisCol = this.get("columnData"),
        parentForm = this.get("parentForm");
    if(listenToMap[columnData.name]) {
      listenToMap[columnData.name].forEach(function(listening) {
        var listeningViews = listening.get("views");
        for(var i = 0; i < listeningViews.length; i++) {
          var view = listeningViews[i];
          if(view !== callingView) {
            view.listenedColumnChanged(columnData, val, oldVal);
          }
          if(view.get("columnData.bubbleValues") && parentForm && parentForm.bubbleValChange) parentForm.bubbleValChange(columnData, val, oldVal, callingView);
        }
      });
    }
    if(!Ember.isNone(oldVal) && this.get("record")) {
      this.get("record").set("tmplPropChangeHook", columnData.name);
    }
  },

  registerForValChange : function(colView, listenColName) {
    var listenToMap = this.get("listenToMap"), existing,
        callingCol = colView.get("columnData"),
        colName = callingCol.get("name"),
        parentForm = this.get("parentForm");
    listenColName = (listenColName && listenColName.get ? listenColName.get("name") : listenColName);
    if(callingCol.get("bubbleValues") && parentForm && parentForm.registerForValChange) parentForm.registerForValChange(colView, listenColName);
    if(!listenToMap) {
      listenToMap = {};
      this.set("listenToMap", listenToMap);
    }
    listenToMap[listenColName] = listenToMap[listenColName] || [];
    existing = listenToMap[listenColName].findBy("name", colName);
    if(existing) {
      existing.get("views").pushObject(colView);
    }
    else {
      listenToMap[listenColName].pushObject(Ember.Object.create({views : [colView], name : colName}));
    }
  },

  unregisterForValChange : function(colView, listenColName) {
    var listenToMap = this.get("listenToMap"), callingCol = colView.get("columnData"),
        colName = callingCol.get("name"),
        colListener = listenToMap && listenToMap[listenColName],
        existing = colListener && listenToMap[listenColName].findBy("name", colName),
        parentForm = this.get("parentForm");
    listenColName = (listenColName && listenColName.get ? listenColName.get("name") : listenColName);
    if(callingCol.get("bubbleValues") && parentForm && parentForm.unregisterForValChange) parentForm.unregisterForValChange(colView, listenColName);
    if(existing) {
      var existingViews = existing.get("views");
      existingViews.removeObject(colView);
      if(existingViews.length === 0) {
        colListener.removeObject(existing);
      }
      else {
        for(var i = 0; i < existingViews.length; i++) {
          existingViews[i].colValueChanged(Ember.Object.create({name : listenColName, key : listenColName}), null, null);
        }
      }
    }
  },
});

return {
  ColumnDataChangeCollectorMixin : ColumnDataChangeCollectorMixin,
};

});

define('column-data/utils/columnDataValueMixin',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * A mixin that aliases the value of the attribute given by 'columnData' in 'record' to 'value'.
 *
 * @class ColumnDataValueMixin
 * @module column-data
 * @submodule column-data-utils
 */
var ColumnDataValueMixin = Ember.Mixin.create({
  init : function() {
    this._super();
    this.recordDidChange();
    this.registerForValChangeChild();
  },

  /**
   * Column data instance to be used to extract value.
   *
   * @property columnData
   * @type Class
   */
  columnData : null,

  /**
   * Record to extract the value from.
   *
   * @property record
   * @type Class
   */
  record : null,

  listenedColumnChanged : function(changedColumnData, changedValue, oldValue) {
    this.listenedColumnChangedHook(changedColumnData, changedValue, oldValue);
    if(changedColumnData.get("name") === this.get("columnData.name")) {
      var that = this;
      //The delay is added cos destroy on the view of removed record is called before it is actually removed from array
      //TODO : find a better way to do this check
      Timer.addToQue("duplicateCheck-"+Utils.getEmberId(this), 100).then(function() {
        if(!that.get("isDestroyed")) {
          that.validateValue(that.get("val"));
        }
      });
    }
  },
  /**
   * Callback callled when the column listened on changes.
   *
   * @method listenedColumnChangedHook
   * @param {ColumnData} changedColumnData ColumnData instance of the changed column.
   * @param {any} changedValue
   * @param {any} oldValue
   */
  listenedColumnChangedHook : function(changedColumnData, changedValue, oldValue) {
  },

  disableValidation : false,
  validateValue : function(value) {
    var columnData = this.get("columnData"), record = this.get("record"),
        validation = columnData.get("validation");
    if(validation) {
      if(!this.get("disableValidation")) {
        var validVal = validation.validateValue(value, record);
        if(validVal[0]) record._validation[columnData.name] = 1;
        else delete record._validation[columnData.name];
        this.set("invalid", validVal[0]);
        this.set("invalidReason", !Ember.isEmpty(validVal[1]) && validVal[1]);
      }
      else {
        delete record._validation[columnData.name];
      }
    }
    record.set("validationFailed", Utils.hashHasKeys(record._validation));
  },

  /**
   * An alias to the value in attribute. It undergoes validations and the change will be bubbled.
   *
   * @property value
   */
  value : function(key, val) {
    var columnData = this.get("columnData"), record = this.get("record"),
        parentForBubbling = this.get("parentForBubbling");
    if(!record || !columnData) return val;
    record._validation = record._validation || {};
    if(arguments.length > 1) {
      if(!(record instanceof DS.Model) || (record.currentState && !record.currentState.stateName.match("deleted"))) {
        var oldVal = record.get(columnData.get("key"));
        this.validateValue(val);
        //TODO : find a better way to fix value becoming null when selection changes
        //if(val || !columnData.get("cantBeNull")) {
          record.set(columnData.get("key"), val);
          this.valueChangeHook(val);
          if(parentForBubbling && parentForBubbling.bubbleValChange) parentForBubbling.bubbleValChange(columnData, val, oldVal, this); 
        //}
      }
      return val;
    }
    else {
      val = record.get(columnData.get("key"));
      this.validateValue(val);
      if(parentForBubbling && parentForBubbling.bubbleValChange) parentForBubbling.bubbleValChange(columnData, val, oldVal, this); 
      return val;
    }
  }.property("columnData.key", "view.columnData.key", "disableValidation", "view.disableValidation"),

  /**
   * Callback called when the value changes.
   *
   * @method valueChangeHook
   * @param {any} val
   */
  valueChangeHook : function(val) {
  },

  prevRecord : null,
  recordDidChange : function() {
    var record = this.get("record"), prevRecord = this.get("prevRecord"),
        columnData = this.get("columnData");
    if(prevRecord) {
      Ember.removeObserver(prevRecord, columnData.get("key"), this, "notifyValChange");
    }
    if(record) {
      this.recordChangeHook();
      Ember.addObserver(record, columnData.get("key"), this, "notifyValChange");
      this.set("prevRecord", record);
    }
    else if(prevRecord) {
      this.recordRemovedHook();
    }
    this.notifyPropertyChange("value");
  }.observes("record", "view.record"),
  /**
   * Callback called when record changes.
   *
   * @method recordChangeHook
   */
  recordChangeHook : function() {
  },
  /**
   * Callback called when record is removed (set to null).
   *
   * @method recordRemovedHook
   */
  recordRemovedHook : function(){
  },

  notifyValChange : function(obj, key) {
    this.notifyPropertyChange("value");
    this.valueChangeHook(this.get("value"));
  },

  registerForValChangeChild : function() {
    var columnData = this.get("columnData"), parentForBubbling = this.get("parentForBubbling");
    if(columnData && columnData.get("columnListenerEntries")) {
      columnData.get("columnListenerEntries").forEach(function(listenCol) {
        if(parentForBubbling && parentForBubbling.registerForValChange) parentForBubbling.registerForValChange(this, listenCol);
      }, this);
    }
  }.observes("columnData", "view.columnData"),

  unregisterForValChangeChild : function() {
    var columnData = this.get("columnData"), parentForBubbling = this.get("parentForBubbling");
    if(columnData.get("columnListenerEntries")) {
      columnData.get("columnListenerEntries").forEach(function(listenCol) {
        if(parentForBubbling && parentForBubbling.unregisterForValChange) parentForBubbling.unregisterForValChange(this, listenCol);
      }, this);
    }
  },

  /**
   * Parent object with mixin ColumnData.ColumnDataChangeCollectorMixin to bubble to.
   *
   * @property parentForBubbling
   * @type Instance
   */
  parentForBubbling : null,

  destroy : function() {
    this._super();
    this.unregisterForValChangeChild();
  },
});

return {
  ColumnDataValueMixin : ColumnDataValueMixin,
};

});

/**
 * Utility classes related to column data.
 *
 * @submodule column-data-utils
 * @module column-data
 */

define('column-data/utils/main',[
  "ember",
  "./columnDataChangeCollectorMixin",
  "./columnDataValueMixin",
], function(Ember) {
  var mod = {};
  for(var i = 1; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        mod[k] = arguments[i][k];
      }
    }
  }

  return mod;
});

/**
 * Module for meta data of a record type and its properties.
 *
 * @module column-data
 */
define('column-data/main',[
  "./columnDataGroup",
  "./columnData",
  "./validations/main",
  "./utils/main",
], function() {
  var ColumnData = Ember.Namespace.create();
  window.ColumnData = ColumnData;

  //start after DS
  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ColumnData[k] = arguments[i][k];
      }
    }
  }

  ColumnData.initializer = function(app) {
    if(app.ColumnData) {
      for(var i = 0; i < app.ColumnData.length; i++) {
        ColumnData.ColumnDataGroup.create(app.ColumnData[i]);
      }
    }
  };

  return ColumnData;
});

define('timer/timer-consts',[
  "ember",
], function(Ember) {

/**
 * Default timeout for the asyncQue.
 *
 * @property TIMEOUT
 * @for Timer
 * @type Number
 * @default 500
 * @static
 */
var TIMEOUT = 500;

/**
 * Timer ticks.
 *
 * @property TIMERTIMEOUT
 * @for Timer
 * @type Number
 * @default 250
 * @static
 */
var TIMERTIMEOUT = 250;

return {
  TIMEOUT : TIMEOUT,
  TIMERTIMEOUT : TIMERTIMEOUT,
};

});

define('timer/asyncQue',[
  "ember",
  "./timer-consts",
], function(Ember, TimerConsts) {

var queMap = {};

/**
 * @class AsyncQue
 * @for Timer
 * @private
 */
var AsyncQue = Ember.Object.extend({
  init : function() {
    this._super();
    var that = this, timer;
    Ember.run.later(function() {
      that.timerTimedout();
    }, that.get("timeout") || TimerConsts.TIMEOUT);
  },

  timerTimedout : function() {
    if(!this.get("resolved")) {
      var that = this;
      Ember.run(function() {
        delete queMap[that.get("key")];
        that.set("resolved", true);
        that.get("resolve")();
      });
    }
  },

  /**
   * native timer
   *
   * @property timer
   * @for AsyncQue
   * @type Number
   */
  timer : null,

  /**
   * unique identifier for the associated task
   *
   * @property key
   * @type String
   */
  key : "",

  /**
   * resolve function of the associated promise
   *
   * @property resolve
   * @type Function
   */
  resolve : null,

  /**
   * reject function of the associated promise
   *
   * @property reject
   * @type Function
   */
  reject : null,

  /**
   * boolean to indicate whether the associated promise has resolved
   *
   * @property resolved
   * @type boolean
   */
  resolved : false,

  /**
   * timeout after which the associated promise resolves
   *
   * @property reject
   * @type Number
   */
  timeout : TimerConsts.TIMEOUT,
});

/**
 * Public API to create a job into async que.
 * 
 * @method addToQue
 * @for Timer
 * @return {Class} Promise created for the async-que.
 * @param {String} key Unique identifier for the job.
 * @param {Number} [timeout=Timer.TIMEOUT] timeout after which the job should be run.
 */
var addToQue = function(key, timeout) {
  if(queMap[key]) {
    queMap[key].set("resolved", true);
    queMap[key].get("reject")();
  }
  var promise;
  Ember.run(function() {
    promise = new Ember.RSVP.Promise(function(resolve, reject) {
      var asyncQue = AsyncQue.create({key : key, resolve : resolve, reject : reject, timeout : timeout});
      queMap[key] = asyncQue;
    });
  });
  return promise;
};

return {
  addToQue : addToQue,
};

});

define('timer/timerObj',[
  "ember",
  "./timer-consts",
], function(Ember, TimerConsts) {


var curTimer = null;
var timers = [];

/**
 * A timer module which executes a job periodically.
 *
 * @class TimerObj
 * @for Timer
 */
var TimerObj = Ember.Object.extend({
  init : function() {
    this._super();
    timers.push(this);
    this.set("ticks", Math.ceil(this.get("timeout") / TimerConsts.TIMERTIMEOUT));
    if(!Timer.curTimer) {
      curTimer = setInterval(timerFunction, TimerConsts.TIMERTIMEOUT);
    }
    var that = this;
    this.set("promise", new Ember.RSVP.Promise(function(resolve, reject) {
      that.setProperties({
        resolve : resolve,
        reject : reject,
      });
    }));
  },

  /**
   * Periodic timeout after which the job should be executed.
   *
   * @property timeout
   * @type boolean
   * @default Timer.TIMERTIMEOUT
   */
  timeout : TimerConsts.TIMERTIMEOUT,

  /**
   * Number of times of Timer.TIMERTIMEOUT per period.
   *
   * @property ticks
   * @type Number
   * @default 1
   * @private
   */
  ticks : 1,

  /**
   * Number of times to execute the job.
   *
   * @property count
   * @type Number
   * @default 0
   */
  count : 0,

  /**
   * Callback executed every period. The job goes here.
   *
   * @method timerCallback
   */
  timerCallback : function() {
  },


  /**
   * Callback executed after the end of timer.
   *
   * @method endCallback
   */
  endCallback : function() {
  },

  promise : null,
  resolve : null,
  reject : null,
});

var timerFunction = function() {
  Ember.run(function() {
    if(timers.length === 0) {
      clearTimeout(curTimer);
      curTimer = null;
    }
    else {
      for(var i = 0; i < timers.length;) {
        var timer = timers[i];
        timer.decrementProperty("ticks");
        if(timer.get("ticks") === 0) {
          timer.set("ticks", Math.ceil(timer.get("timeout") / TimerConsts.TIMERTIMEOUT));
          timer.timerCallback();
          timer.decrementProperty("count");
        }
        if(timer.get("count") <= 0) {
          timers.removeAt(i);
          timer.endCallback();
          timer.get("resolve")();
        }
        else {
          i++;
        }
      }
    }
  });
};

return {
  TimerObj : TimerObj,
};

});

/**
 * Timer module with stuff related to timers.
 *
 * @module timer
 */
define('timer/main',[
  "./timer-consts",
  "./asyncQue",
  "./timerObj",
], function() {
  /**
   * Timer global class.
   *
   * @class Timer
   */
  var Timer = Ember.Namespace.create();
  window.Timer = Timer;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        Timer[k] = arguments[i][k];
      }
    }
  }

  return Timer;
});

define('array-modifier/array-modifier-types/arrayModifier',[
  "ember",
], function(Ember) {

/**
 * Base class for array modifier
 *
 * @class ArrayMod.ArrayModifier
 * @module array-modifier
 * @submodule array-modifier-types
 */
var ArrayModifier = Ember.Object.extend({
  /**
   * Type of the array modifier.
   *
   * @property type
   * @type String
   * @default "basic"
   * @readonly
   */
  type : "basic",

  /**
   * Array modifier group type the modifier belongs to.
   *
   * @property groupType
   * @type String
   * @default "basic"
   * @readonly
   */
  groupType : "basic",

  /**
   * Property the modifier applies on.
   *
   * @property property
   * @type String
   */
  property : "",

  /**
   * Set to true if a listener on all objects in the array should be added.
   *
   * @property addObserverToAll
   * @type Boolean
   * @default true
   */
  addObserverToAll : true,

  /**
   * Function called when observers are supposed to be added.
   *
   * @method addModObservers
   * @param {Class} context Context to add the observer to.
   * @param {String|Function} method Method to be called when observer is called.
   */
  addModObservers : function(context, method) {
    Ember.addObserver(this, "property", context, method);
  },

  /**
   * Function called when observers are supposed to be removed.
   *
   * @method removeModObservers
   * @param {Class} context Context to add the observer to.
   * @param {String|Function} method Method to be called when observer is called.
   */
  removeModObservers : function(context, method) {
    Ember.removeObserver(this, "property", context, method);
  },
});

return {
  ArrayModifier : ArrayModifier,
};

});

define('array-modifier/array-modifier-types/arrayFilterModifier',[
  "ember",
  "./arrayModifier",
], function(Ember, ArrayModifier) {

/**
 * Base class for array filter, which removes/adds elements.
 *
 * @class ArrayMod.ArrayFilterModifier
 * @extends ArrayMod.ArrayModifier
 * @module array-modifier
 * @submodule array-modifier-types
 */
var ArrayFilterModifier = ArrayModifier.ArrayModifier.extend({
  type : "filter",
  groupType : "filter",

  /**
   * Method called to modify an entire array.
   *
   * @method modify
   * @param {Array} array The array to modify.
   */
  modify : function(array) {
    return array.filter(function(item) {
      var value = item.get(this.get("property"));
      this.modFun(item, value);
    }, this);
  },

  /**
   * Method called to modify a single element.
   *
   * @method modify
   * @param {Class} item The item to modify.
   * @param {any} value The value to modfiy on.
   */
  modFun : function(item, value) {
    return true;
  },
});

return {
  ArrayFilterModifier : ArrayFilterModifier,
};

});

define('array-modifier/array-modifier-types/arraySearchModifier',[
  "ember",
  "./arrayFilterModifier",
], function(Ember, ArrayFilterModifier) {

/**
 * Class to search for a string in the array elements.
 *
 * @class ArrayMod.ArraySearchModifier
 * @extends ArrayMod.ArrayFilterModifier
 * @module array-modifier
 * @submodule array-modifier-types
 */
var ArraySearchModifier = ArrayFilterModifier.ArrayFilterModifier.extend({
  type : "search",

  /**
   * Search string.
   *
   * @property searchString
   * @type String
   */
  searchString : "",

  /**
   * If set to true, all elements matching searchString will be removed, else all elements not matching searchString will be removed.
   *
   * @property negate
   * @type Boolean
   * @default false
   */
  negate : false,

  /**
   * Search string regex object.
   *
   * @property searchRegex
   * @type RegEx
   * @private
   */
  searchRegex : function() {
    var searchString = this.get("searchString") || "";
    searchString = searchString.replace(/([\.\[\]\?\+\*])/g, "\\$1");
    return new RegExp(searchString, "i");
  }.property('searchString'),

  modFun : function(item, value) {
    var negate = this.get("negate"), filter = this.get("searchRegex").test(value)
    return (negate && !filter) || (!negate && filter);
  },

  addModObservers : function(context, method) {
    this._super();
    //handle this seperately
    Ember.addObserver(this, "searchString", context, method+"_each");
    Ember.addObserver(this, "negate", context, method+"_each");
  },

  removeModObservers : function(context, method) {
    this._super();
    Ember.removeObserver(this, "searchString", context, method+"_each");
    Ember.removeObserver(this, "negate", context, method+"_each");
  },
});

return {
  ArraySearchModifier : ArraySearchModifier,
};

});

define('array-modifier/array-modifier-types/arrayTagObjectModifier',[
  "ember",
  "lib/ember-utils-core",
  "./arrayFilterModifier",
], function(Ember, Utils, ArrayFilterModifier) {

/**
 * Class for a tag. Never used directly. Passed as an object to ArrayMod.ArrayTagSearchModifier.
 *
 * @class ArrayMod.TagObject
 * @module array-modifier
 * @submodule array-modifier-types
 */
var TagObject = Ember.Object.extend({
  /**
   * Label for the tag.
   *
   * @property label
   * @type String
   */
  label : "",

  /**
   * Value for the tag.
   *
   * @property val
   * @type String
   */
  val : "",

  /**
   * Checked boolean.
   *
   * @property checked
   * @type Boolean
   * @default true
   */
  checked : true,

  /**
   * If set to true, val will be not taken if checked, else val will be taken if checked.
   *
   * @property negate
   * @type Boolean
   * @default false
   */
  negate : false,
});

/**
 * Class to filter elements based on tags.
 *
 * @class ArrayMod.ArrayTagSearchModifier
 * @extends ArrayMod.ArrayFilterModifier
 * @module array-modifier
 * @submodule array-modifier-types
 */
var ArrayTagSearchModifier = ArrayFilterModifier.ArrayFilterModifier.extend({
  type : "tagSearch",

  /**
   * Tags to filter with. Elements are ArrayMod.TagObject instances. But passed as objects while creating.
   *
   * @property tags
   */
  tags : Utils.hasMany(TagObject),

  /**
   * Tags that are taken.
   *
   * @property selectedTags
   */
  selectedTags : Ember.computed.filterBy("tags", "checked", true),

  /**
   * Joiner for the tags. Can be "or" or "and".
   *
   * @property joiner
   * @type String
   * @default "or"
   */
  joiner : "or",

  modFun : function(item, value) {
    var tags = this.get("selectedTags"), joiner = this.get("joiner") == "and", bool = joiner;
    for(var i = 0; i < tags.length; i++) {
      var res = value == tags[i].get("val"), tagNegate = tags[i].get("negate");
      res = (tagNegate && !res) || (!tagNegate && res);
      bool = (joiner && (bool && res)) || (!joiner && (bool || res));
    }
    return bool;
  },

  addModObservers : function(context, method) {
    this._super();
    //handle this seperately
    Ember.addObserver(this, "selectedTags.@each.val",    context, method+"_each");
    Ember.addObserver(this, "selectedTags.@each.negate", context, method+"_each");
  },

  removeModObservers : function(context, method) {
    this._super();
    Ember.removeObserver(this, "selectedTags.@each.val",    context, method+"_each");
    Ember.removeObserver(this, "selectedTags.@each.negate", context, method+"_each");
  },
});

return {
  ArrayTagSearchModifier : ArrayTagSearchModifier,
};

});

define('array-modifier/array-modifier-types/arraySortModifier',[
  "ember",
  "./arrayModifier",
], function(Ember, ArrayModifier) {

/**
 * Class to sort elements in the array.
 *
 * @class ArrayMod.ArraySortModifier
 * @extends ArrayMod.ArrayModifier
 * @module array-modifier
 * @submodule array-modifier-types
 */
var ArraySortModifier = ArrayModifier.ArrayModifier.extend({
  type : "sort",
  groupType : "sort",

  /**
   * Order to sort by. true for ascending, false for descending
   *
   * @property order
   * @type String
   * @default true
   */
  order : true,

  addObserverToAll : false,

  modify : function(array) {
    array.sortBy(this.get("property"));
    if(!this.get("order")) array.reverseObjects();
    return array;
  },

  addModObservers : function(context, method) {
    this._super();
    Ember.addObserver(this, "order", context, method);
  },

  removeModObservers : function(context, method) {
    this._super();
    Ember.removeObserver(this, "order", context, method);
  },
});


return {
  ArraySortModifier : ArraySortModifier,
};

});

/**
 * Array modifier types
 *
 * @submodule array-modifier-types
 * @module array-modifier
 */
define('array-modifier/array-modifier-types/main',[
  "./arrayModifier",
  "./arrayFilterModifier",
  "./arraySearchModifier",
  "./arrayTagObjectModifier",
  "./arraySortModifier",
], function(ArrayModifier, ArrayFilterModifier, ArraySearchModifier, ArrayTagSearchModifier, ArraySortModifier) {
  var ArrayModTypes = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ArrayModTypes[k] = arguments[i][k];
      }
    }
  }
  ArrayModTypes.ArrayModMap = {
    basic : ArrayModifier.ArrayModifier,
    filter : ArrayFilterModifier.ArrayFilterModifier,
    search : ArraySearchModifier.ArraySearchModifier,
    tagSearch : ArrayTagSearchModifier.ArrayTagSearchModifier,
    sort : ArraySortModifier.ArraySortModifier,
  };

  return ArrayModTypes;
});

define('array-modifier/array-modifier-groups/arrayModGroup',[
  "ember",
  "../array-modifier-types/main",
  "lib/ember-utils-core",
], function(Ember, ArrayModType, Utils) {

/** 
 * Basic array modifier group.
 *
 * @class ArrayMod.ArrayModGroup
 * @module array-modifier
 * @submodule array-modifier-groups
 */
var ArrayModGroup = Ember.Object.extend(Utils.ObjectWithArrayMixin, {
  type : "basic",

  /**
   * Array modifiers present in the group. Use object while creating.
   *
   * @property arrayMods
   * @type Array
   */
  arrayMods : Utils.hasMany(ArrayModType.ArrayModMap, "type"),

  arrayProps : ['arrayMods'],
  idx : 0,

  /**
   * Method that returns whether an item can be added or not.
   *
   * @method canAdd
   * @param {Class} item Item that is to be checked whether it can be added or not.
   * @returns {Boolean}
   */
  canAdd : function(item) {
    return true;
  },

  modify : function(array) {
    var arrayMods = this.get("arrayMods");
    for(var i = 0; i < arrayMods.length; i++) {
      array = arrayMods[i].modify(array);
    }
    return array;
  },
});

return {
  ArrayModGroup : ArrayModGroup,
};

});

define('array-modifier/array-modifier-groups/arrayFilterGroup',[
  "ember",
  "./arrayModGroup",
], function(Ember, ArrayModGroup) {

/** 
 * Array filter modifier group which has ArrayMod.ArrayFilterModifier and ArrayMod.ArraySearchModifier
 *
 * @class ArrayMod.ArrayFilterGroup
 * @extends ArrayMod.ArrayModGroup
 * @module array-modifier
 * @submodule array-modifier-groups
 */
var ArrayFilterGroup = ArrayModGroup.ArrayModGroup.extend({
  type : "filter",

  canAdd : function(item) {
    var arrayMods = this.get("arrayMods");
    for(var i = 0; i < arrayMods.length; i++) {
      var value = item.get(arrayMods[i].get("property"));
      if(!arrayMods[i].modFun(item, value)) {
        return false;
      }
    }
    return true;
  },

  modify : function(array) {
    var that = this;
    return array.filter(function(item) {
      return that.canAdd(item);
    }, this);
  },

  modifySingle : function(array, item, idx) {
    if(this.canAdd(item)) {
      if(!array.contains(item)) {
        if(idx === -1) {
          array.pushObject(item);
        }
        else {
          array.insertAt(idx, item);
        }
      }
      return true;
    }
    else if(array.contains(item)) {
      array.removeObject(item);
    }
    return false;
  },
});

return {
  ArrayFilterGroup : ArrayFilterGroup,
};

});

define('array-modifier/array-modifier-groups/arraySortGroup',[
  "ember",
  "./arrayModGroup",
], function(Ember, ArrayModGroup) {

/** 
 * Array sort modifier group.
 *
 * @class ArrayMod.ArraySortGroup
 * @extends ArrayMod.ArrayModGroup
 * @module array-modifier
 * @submodule array-modifier-groups
 */
var Compare = function(a, b) {
  return a === b ? 0 : (a > b ? 1 : -1);
};
var ArraySortGroup = ArrayModGroup.ArrayModGroup.extend({
  type : "sort",

  compare : function(a, b) {
    var arrayMods = this.get("arrayMods");
    for(var i = 0; i < arrayMods.length; i++) {
      var av = a.get(arrayMods[i].get("property")),
          bv = b.get(arrayMods[i].get("property")),
          cmp = Compare(av, bv),
          order = arrayMods[i].get("order");
      if(!order) {
        cmp = -cmp;
      }
      if(cmp) {
        return cmp;
      }
      else {
        continue;
      }
    }
    return 0;
  },

  modify : function(array) {
    var that = this;
    return array.sort(function(a, b) {
      return that.compare(a, b);
    }, this);
  },

  modifySingle : function(array, item, idx) {
    var that = this;
    if(array.contains(item)) {
      array.removeObject(item);
    }
    Utils.binaryInsert(array, item, function(a, b) {
      return that.compare(a, b);
    });
    return true;
  },
});

return {
  ArraySortGroup : ArraySortGroup,
  Compare : Compare,
};

});

/**
 * Module to handle array modification like sorting, searching and filtering.
 *
 * @module array-modifier-groups
 */
define('array-modifier/array-modifier-groups/main',[
  "./arrayModGroup",
  "./arrayFilterGroup",
  "./arraySortGroup",
], function(ArrayModGroup, ArrayFilterGroup, ArraySortGroup) {
  var ArrayModGroup = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ArrayModGroup[k] = arguments[i][k];
      }
    }
  }

  ArrayModGroup.ArrayModGroupMap = {
    basic : ArrayModGroup.ArrayModGroup,
    filter : ArrayFilterGroup.ArrayFilterGroup,
    sort : ArraySortGroup.ArraySortGroup,
  };

  return ArrayModGroup;
});

define('array-modifier/arrayModController',[
  "ember",
  "lib/ember-utils-core",
  "../timer/main",
  "./array-modifier-types/main",
  "./array-modifier-groups/main",
], function(Ember, Utils, Timer, ArrayModType, ArrayModGroup) {

/**
 * Array controller which will modify the array on 'content' and put it under 'arrangedContent'.
 *
 * @class ArrayMod.ArrayModController
 */
//TODO : revisit the observers addition and deletion
var ArrayModController = Ember.ArrayController.extend(Utils.ObjectWithArrayMixin, {
  init : function() {
    this._super();
  },

  unique_id : function() {
    return Utils.getEmberId(this);
  }.property(),

  /**
   * Array mods added to the controller.
   *
   * @property arrayMods
   * @type Array
   */
  //arrayMods : Utils.hasMany(ArrayModType.ArrayModMap, "type"),
  arrayMods : null,

  /**
   * Array mods groups formed by arrayMods.
   *
   * @property arrayMods
   * @type Array
   * @readOnly
   */
  //arrayModGrps : Utils.hasMany(ArrayModGroup.ArrayModGroupMap, "type"),
  arrayModGrps : null,

  arrayProps : ['arrayMods', 'arrayModGrps'],
  //not firing on adding new objects!
  isModified : function() {
    var arrayModGrps = this.get('arrayModGrps');
    return !!arrayModGrps && arrayModGrps.length > 0;
  }.property('arrayModGrps.@each'),

  addArrayModToGroup : function(arrayMod) {
    var arrayModGrps = this.get("arrayModGrps"), arrayModGrp = arrayModGrps.findBy("type", arrayMod.get("groupType")),
        arrayMods = this.get("arrayMods");
    if(arrayModGrp) {
      Utils.binaryInsert(arrayModGrp.get("arrayMods"), arrayMod, function(a, b) {
        return ArrayModGroup.Compare(arrayMods.indexOf(a), arrayMods.indexOf(b));
      });
    }
    else {
      arrayModGrp = ArrayMod.ArrayModGroupMap[arrayMod.get("groupType")].create({
        arrayMods : [arrayMod],
        idx : arrayMods.indexOf(arrayMod),
      });
      Utils.binaryInsert(arrayModGrps, arrayModGrp, function(a, b) {
        return ArrayModGroup.Compare(arrayMods.indexOf(a), arrayMods.indexOf(b));
      });
    }
  },

  removeArrayModFromGroup : function(arrayMod) {
    var arrayModGrps = this.get("arrayModGrps"), arrayModGrp = arrayModGrps.findBy("type", arrayMod.get("groupType")),
        arrayMods = arrayModGrp.get("arrayMods");
    if(arrayModGrp) {
      arrayMods.removeObject(arrayMod);
      if(arrayMods.length === 0) {
        arrayModGrps.removeObject(arrayModGrp);
      }
    }
  },

  arrayModsWillBeDeleted : function(deletedArrayMods, idx) {
    var content = this.get("content") || [], arrangedContent = this.get("arrangedContent"),
        that = this;
    for(var i = 0; i < deletedArrayMods.length; i++) {
      var arrayMod = deletedArrayMods[i];
      arrayMod.removeModObservers(this, "arrayModsDidChange");
      content.forEach(function(item) {
        if(this.arrayMod.get("addObserverToAll") || this.arrangedContent.contains(item)) {
          Ember.addObserver(item, this.arrayMod.get("property"), this.that, "contentItemPropertyDidChange");
        }
      }, {that : this, arrayMod : arrayMod, arrangedContent : arrangedContent});
      this.removeArrayModFromGroup(arrayMod);
    }
    Timer.addToQue(this.get("unique_id")+"__ArrayModChanged", 250).then(function() {
      that.notifyPropertyChange("arrangedContent");
    });
  },
  arrayModsWasAdded : function(addedArrayMods, idx) {
    var content = this.get("content") || [], arrangedContent = this.get("arrangedContent"),
        that = this;
    for(var i = 0; i < addedArrayMods.length; i++) {
      var arrayMod = addedArrayMods[i];
      arrayMod.addModObservers(this, "arrayModsDidChange");
      content.forEach(function(item) {
        if(this.arrayMod.get("addObserverToAll") || this.arrangedContent.contains(item)) {
          Ember.removeObserver(item, this.arrayMod.get("property"), this.that, "contentItemPropertyDidChange");
        }
      }, {that : this, arrayMod : arrayMod, arrangedContent : arrangedContent});
      this.addArrayModToGroup(arrayMod);
    }
    Timer.addToQue(this.get("unique_id")+"__ArrayModChanged", 250).then(function() {
      that.notifyPropertyChange("arrangedContent");
    });
  },

  addObserversToItems : function(override, arranged) {
    var content = override || this.get("content") || [], arrangedContent = arranged || this.get("arrangedContent"),
        arrayMods = this.get("arrayMods");
    content.forEach(function(item) {
      for(var i = 0; i < this.arrayMods.length; i++) {
        if(this.arrayMods[i].get("addObserverToAll") || this.arrangedContent.contains(item)) {
          Ember.addObserver(item, this.arrayMods[i].get("property"), this.that, "contentItemPropertyDidChange");
        }
      }
    }, {that : this, arrayMods : arrayMods, arrangedContent : arrangedContent});
  },

  removeObserversFromItems : function(override, arranged) {
    var content = override || this.get("content") || [], arrangedContent = arranged || this.get("arrangedContent"),
        arrayMods = this.get("arrayMods");
    content.forEach(function(item) {
      for(var i = 0; i < this.arrayMods.length; i++) {
        if(this.arrayMods[i].get("addObserverToAll") || this.arrangedContent.contains(item)) {
          Ember.removeObserver(item, this.arrayMods[i].get("property"), this.that, "contentItemPropertyDidChange");
        }
      }
    }, {that : this, arrayMods : arrayMods, arrangedContent : arrangedContent});
  },

  arrayModsDidChange : function() {
    var that = this;
    Timer.addToQue(this.get("unique_id")+"__ArrayModChanged", 250).then(function() {
      that.notifyPropertyChange("arrangedContent");
    });
  },

  arrayModsDidChange_each : function() {
    var that = this;
    Timer.addToQue(this.get("unique_id")+"__ArrayModChanged_Each", 500).then(function() {
      var content = that.get("content"), arrangedContent = that.get("arrangedContent"),
          arrayModGrps = that.get('arrayModGrps');
      //enclose the operation in a run loop to decrease the view render overhead
      Ember.run(function() {
        for(var i = 0; i < content.get("length"); i++) {
          var item = content.objectAt(i), inArrangedContent = arrangedContent.contains(item),
              canAdd = true;
          for(var j = 0; j < arrayModGrps.length; j++) {
            if(!arrayModGrps[j].canAdd(item)) {
              canAdd = false;
              break;
            }
          }
          if(inArrangedContent && !canAdd) {
            arrangedContent.removeObject(item);
          }
          else if(!inArrangedContent && canAdd) {
            for(var j = 0; j < arrayModGrps.length; j++) {
              if(!arrayModGrps[j].modifySingle(arrangedContent, item, arrangedContent.indexOf(item))) {
                break;
              }
            }
          }
        }
      });
    });
  },

  destroy : function() {
    this.removeObserversFromItems();
    return this._super();
  },

  arrangedContent : Ember.computed('content', function(key, value) {
    var content = this.get('content'), retcontent,
        arrayModGrps = this.get('arrayModGrps'),
        isModified = !!arrayModGrps && arrayModGrps.length > 0,
        that = this, hasContent = content && (content.length > 0 || (content.get && content.get("length") > 0));

    if(content) {
      retcontent = content.slice();
      if(isModified) {
        for(var i = 0; i < arrayModGrps.length; i++) {
          if(retcontent.length > 0) {
            retcontent = arrayModGrps[i].modify(retcontent);
          }
        }
        this.addObserversToItems(content, retcontent);
      }
      return Ember.A(retcontent);
    }

    return Ember.A([]);
  }),

  _contentWillChange : Ember.beforeObserver('content', function() {
    this.removeObserversFromItems();
    this._super();
  }),

  contentArrayWillChange : function(array, idx, removedCount, addedCount) {
    var isModified = this.get('isModified');
    if(isModified) {
      var arrangedContent = this.get('arrangedContent'),
          removedObjects = array.slice(idx, idx+removedCount),
          arrayModGrps = this.get('arrayModGrps');
      this.removeObserversFromItems(removedObjects);
      removedObjects.forEach(function(item) {
        this.removeObject(item);
      }, arrangedContent);
    }
  },

  contentArrayDidChange : function(array, idx, removedCount, addedCount) {
    var isModified = this.get('isModified');
    if(isModified) {
      var arrangedContent = this.get('arrangedContent'),
          addedObjects = array.slice(idx, idx+addedCount),
          arrayModGrps = this.get('arrayModGrps');
      this.addObserversToItems(addedObjects);
      for(var i = 0; i < addedObjects.length; i++) {
        for(var j = 0; j < arrayModGrps.length; j++) {
          if(!arrayModGrps[j].modifySingle(arrangedContent, addedObjects[i], arrangedContent.indexOf(addedObjects[i]))) {
            break;
          }
        }
      }
    }
  },

  contentItemPropertyDidChange : function(item) {
    var arrayModGrps = this.get('arrayModGrps'),
        arrangedContent = this.get("arrangedContent");
    for(var i = 0; i < arrayModGrps.length; i++) {
      if(!arrayModGrps[i].modifySingle(arrangedContent, item, arrangedContent.indexOf(item))) {
        break;
      }
    }
  },
});

return {
  ArrayModController : ArrayModController,
};

});

/**
 * Module to handle array modification like sorting, searching and filtering.
 *
 * @module array-modifier
 */
define('array-modifier/main',[
  "./array-modifier-groups/main",
  "./array-modifier-types/main",
  "./arrayModController",
], function() {
  var ArrayMod = Ember.Namespace.create();
  window.ArrayMod = ArrayMod;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ArrayMod[k] = arguments[i][k];
      }
    }
  }

  return ArrayMod;
});

define('crud-adapter/model-wrapper',[
  "ember",
  "ember_data",
  "lib/ember-utils-core",
], function(Ember, DS, Utils) {

/**
 * Model wrapper model class. No used directly. Instead use createModelWrapper.
 *
 * @class ModelWrapper
 * @for CrudAdapter
 */
var ModelWrapper = DS.Model.extend(Utils.ObjectWithArrayMixin, {
  recordReady : function() {
    var arrayProps = this.get("arrayProps") || [];
    Ember.addObserver(this, "isDirty", this, "attributeDidChange");
    for(var i = 0; i < arrayProps.length; i++) {
      var arrayProp = arrayProps[i];
      this[arrayProp+"WillBeDeleted"] = this.childrenWillBeDeleted;
      this[arrayProp+"WasAdded"] = this.childrenWasAdded;
    }
    this.set("isDirty_alias", this.get("isDirty"));
  },

  childrenWillBeDeleted : function(props, idxs) {
    this._validation = this._validation || {};
    for(var i = 0; i < props.length; i++) {
      var propId = Utils.getEmberId(props[i]);
      delete this._validation[propId];
      Ember.removeObserver(props[i], "validationFailed", this, "validationFailedDidChanged");
      Ember.removeObserver(props[i], "isDirty", this, "attributeDidChange");
      Ember.removeObserver(props[i], "isLoading", this, "attributeDidChange");
      Ember.removeObserver(props[i], "isReloading", this, "attributeDidChange");
      Ember.removeObserver(props[i], "isSaving", this, "attributeDidChange");
    }
  },

  childrenWasAdded : function(props, idxs) {
    for(var i = 0; i < props.length; i++) {
      this.validationFailedDidChanged(props[i], "validationFailed");
      this.attributeDidChange(props[i], "isDirty");
      Ember.addObserver(props[i], "validationFailed", this, "validationFailedDidChanged");
      Ember.addObserver(props[i], "isDirty", this, "attributeDidChange");
      Ember.addObserver(props[i], "isLoading", this, "attributeDidChange");
      Ember.addObserver(props[i], "isReloading", this, "attributeDidChange");
      Ember.addObserver(props[i], "isSaving", this, "attributeDidChange");
    }
  },

  validationFailedDidChanged : function(obj, attr) {
    var val = obj.get(attr), objId = Utils.getEmberId(obj);
    this._validation = this._validation || {};
    if(val) {
      this._validation[objId] = 1;
    }
    else {
      delete this._validation[objId];
    }
    this.set("validationFailed", Utils.hashHasKeys(this._validation));
  },

  attributeDidChange : function(obj, attr) {
    this.set(attr+"_alias", this.get(attr) || obj.get(attr));
  },

  /**
   * Boolean to denote validation failure. Poppulated by form module.
   *
   * @property validationFailed
   * @for ModelWrapper
   * @type Boolean
   */
  validationFailed : false,

  /**
   * Bubbled isLoading boolean from child records.
   *
   * @property isLoading_alias
   * @type Boolean
   */
  isLoading_alias : false,

  /**
   * Bubbled isReloading boolean from child records.
   *
   * @property isReloading_alias
   * @type Boolean
   */
  isReloading_alias : Ember.computed.oneWay("isReloading"),

  /**
   * Bubbled isSaving boolean from child records.
   *
   * @property isSaving_alias
   * @type Boolean
   */
  isSaving_alias : Ember.computed.oneWay("isSaving"),

  /**
   * Bubbled isDirty boolean from child records.
   *
   * @property isDirty_alias
   * @type Boolean
   */
  isDirty_alias : Ember.computed.oneWay("isDirty"),
  isNotDirty : Ember.computed.not("isDirty_alias"),

  /**
   * Boolean to denote disabling of save based on isDirty_alias, validationFailed, isLoading_alias, isReloading_alias, isSaving_alias.
   *
   * @property disableSave
   * @type Boolean
   */
  disableSave : Ember.computed.or("isNotDirty", "validationFailed", "isLoading_alias", "isReloading_alias", "isSaving_alias"),
});

var allowedModelAttrs = [{
  /**
   * Array of primary keys for the model. The values of these keys will be joined with '__' and will be assigned to 'id'.
   *
   * @property keys
   * @type Array
   * @static
   */
  attr : "keys",
  defaultValue : "emptyArray",
}, {
  /**
   * API end point on server for transactions for this model.
   *
   * @property apiName
   * @type String
   * @default "data/generic"
   * @static
   */
  attr : "apiName",
  defaultValue : "value",
  value : "data/generic",
}, {
  /**
   * Keys needed to make delete calls. These values will be taken from either the record or 'CrudAdapter.GlobalData'
   *
   * @property deleteParams
   * @type Array
   * @static
   */
  attr : "deleteParams", 
  defaultValue : "emptyArray",
}, {
  /**
   * Keys needed to make find calls. These values will be taken from either the record or 'CrudAdapter.GlobalData'
   *
   * @property findParams
   * @type Array
   * @static
   */
  attr : "findParams", 
  defaultValue : "emptyArray",
}, {
  /**
   * Keys for extra attributes to be passed along with record attrs during create/update call. These values will be taken from either the record or 'CrudAdapter.GlobalData'
   *
   * @property createUpdateParams
   * @type Array
   * @static
   */
  attr : "createUpdateParams", 
  defaultValue : "emptyArray",
}, {
  /**
   * Keys from record to be deleted when making create/update call.
   *
   * @property ignoreFieldsOnCreateUpdate
   * @type Array
   * @static
   */
  attr : "ignoreFieldsOnCreateUpdate", 
  defaultValue : "emptyArray",
}, {
  /**
   * Keys from backup data to be deleted when data is recieved from server after a create/update call.
   *
   * @property ignoreFieldsOnRetrieveBackup
   * @type Array
   * @static
   */
  attr : "ignoreFieldsOnRetrieveBackup", 
  defaultValue : "emptyArray",
}, {
  /**
   * Keys from record data to be deleted when data is being backed up during a find call.
   *
   * @property removeAttrsFromBackupOnFind
   * @type Array
   * @static
   */
  attr : "removeAttrsFromBackupOnFind", 
  defaultValue : "emptyArray",
}, {
  /**
   * Retain id when backing up data.
   *
   * @property retainId
   * @type Boolean
   * @default false
   * @static
   */
  attr : "retainId", 
  defaultValue : "value",
  value : false,
}, {
  /**
   * Use id from record while backing up (default is to use "new" when creating record and id when updating). Used when records are child records and are not saved directly, in which case the child records must have an id and should be used when backing up.
   *
   * @property useIdForBackup
   * @type Boolean
   * @default false
   * @static
   */
  attr : "useIdForBackup", 
  defaultValue : "value",
  value : false,
}, {
  /**
   * Attribute that will be paginated. Applies during findNext calls.
   *
   * @property paginatedAttribute
   * @type String
   * @default "id"
   * @static
   */
  attr : "paginatedAttribute", 
  defaultValue : "value",
  value : "id",
}, {
  /**
   * Callback called when normalizing record. Will be called twice. Once before serializeRelations is called another by ember-data to normalize payload.
   *
   * @property normalizeFunction
   * @type Function
   * @param {Object} [hash] JSON object of the data returned from server.
   * @static
   */
  attr : "normalizeFunction", 
  defaultValue : "value",
  value : function() {},
}, {
  /**
   * Callback called before serializing child records.
   *
   * @property preSerializeRelations
   * @type Function
   * @param {Object} [data] JSON object of the data returned from server.
   * @static
   */
  attr : "preSerializeRelations", 
  defaultValue : "value",
  value : function() {},
}, {
  /**
   * Callback called for serializing data being sent to server.
   *
   * @property serializeFunction
   * @type Function
   * @param {Class} [record] Record being sent to server.
   * @param {Object} [json] JSON object of the data to be sent to server.
   * @static
   */
  attr : "serializeFunction", 
  defaultValue : "value",
  value : function() {},
}, {
  /**
   * Callback called after backing up data.
   *
   * @property backupData
   * @type Function
   * @param {Class} [record] Record being backed up.
   * @param {String|Class} [type] Record type.
   * @param {Object} [data] JSON object being backed up.
   * @static
   */
  attr : "backupData", 
  defaultValue : "value",
  value : function() {},
}, {
  /**
   * Callback called after retrieving backup data.
   *
   * @property retrieveBackup
   * @type Function
   * @param {Object} [hash] JSON object returned by server.
   * @param {String|Class} [type] Record type.
   * @param {Object} [data] JSON object stored in backup.
   * @static
   */
  attr : "retrieveBackup", 
  defaultValue : "value",
  value : function() {},
}];

/**
 * Function that returns an ember data model.
 *
 * @method createModelWrapper
 * @fro CrudAdapter
 * @param {Object} [object] JSON that are member attributes.
 * @param {Object} [config] JSON that are static attributes.
 * @param {Array} [mixins] Array of mixins to include.
 */
var createModelWrapper = function(object, config, mixins) {
  var args = mixins || [];
  args.push(object);
  var model = ModelWrapper.extend.apply(ModelWrapper, args);
  for(var i = 0; i < allowedModelAttrs.length; i++) {
    if(config[allowedModelAttrs[i].attr]) {
      model[allowedModelAttrs[i].attr] = config[allowedModelAttrs[i].attr];
    }
    else {
      if(allowedModelAttrs[i].defaultValue === "emptyArray") {
        model[allowedModelAttrs[i].attr] = Ember.A();
      }
      else if(allowedModelAttrs[i].defaultValue === "value") {
        model[allowedModelAttrs[i].attr] = allowedModelAttrs[i].value;
      }
    }
  }
  return model;
};

window.attr = DS.attr;
window.hasMany = DS.hasMany;
window.belongsTo = DS.belongsTo;

return {
  createModelWrapper : createModelWrapper,
};

});

define('crud-adapter/getId',[
  "ember",
  "ember_data",
], function(Ember, DS) {

/**
 * Method to get id from a record/object for a type.
 *
 * @method getId
 * @for CrudAdapter
 * @param {Instance|Object} record Record/Object to get id from.
 * @param {Class} type Model for the Record/Object.
 * @returns {String} Id of the record/object.
 */
var getId = function(record, type) {
  var id = record.id;
  if(!id) {
    var keys = type.keys || [], ids = [];
    for(var i = 0; i < keys.length; i++) {
      var attr = (record.get && record.get(keys[i])) || record[keys[i]];
      if(null !== attr || undefined !== attr) {
        ids.push(attr);
      }
      else {
        return null;
      }
    }
    return ids.join("__");
  }
  else {
    return id;
  }
};

return {
  getId : getId,
};

});

define('crud-adapter/backupData',[
  "ember",
  "ember_data",
  "./getId",
], function(Ember, DS, getId) {
getId = getId.getId;

/**
 * Method to backup data for a record if server doesnt return the full data.
 *
 * @method backupData
 * @for CrudAdaptor
 * @param {Instance} record
 * @param {Class} type Model class for the record.
 * @param {String} [operation] Operation when the backup was called.
 * @returns {Object} Backedup data.
 */
var backupDataMap = {};
var backupData = function(record, type, operation) {
  //TODO : make 'new' into a custom new tag extracted from 'type'
  var data = record.toJSON(), 
      backupId = operation === "create" ? "New" : getId(record, type);
      id = getId(record, type) || "New";
  if(type.useIdForBackup) backupId = id;
  backupDataMap[type.typeKey] = backupDataMap[type.typeKey] || {};
  backupDataMap[type.typeKey][backupId] = data;
  if(type.retainId) data.id = id;
  for(var i = 0; i < type.keys.length; i++) {
    if(Ember.isEmpty(data[type.keys[i]])) delete data[type.keys[i]];
  }
  type.eachRelationship(function(name, relationship) {
    var a = record.get(relationship.key);
    if(a) {
      if(relationship.kind == 'hasMany') {
        this.data[relationship.key] = [];
        a.forEach(function(item) {
          this.data[relationship.key].push(backupData(item, relationship.type, operation));
        }, this);
      }
      else if(relationship.kind === "belongsTo") {
        a = a.content;
        this.data[relationship.key] = a ? a.get("id") || a : a;
      }
    }
  }, {data : data, record : record, operation : operation});
  if(type.backupData) {
    type.backupData(record, type, data);
  }
  if(operation === "find") {
    for(var i = 0; i < type.removeAttrsFromBackupOnFind.length; i++) {
      delete data[type.removeAttrsFromBackupOnFind[i]];
    }
  }
  return data;
};

return {
  backupData : backupData,
  backupDataMap : backupDataMap,
};

});

define('crud-adapter/applicationAdapter',[
  "ember",
  "ember_data",
  "./getId",
  "./backupData",
], function(Ember, DS, getId, backupData) {
getId = getId.getId;
var backupDataMap = backupData.backupDataMap;
backupData = backupData.backupData;

var GlobalData = Ember.Object.create();
/**
 * API configuration
 *
 * @class APIConfig
 * @for CrudAdapter
 */
var
APIConfig = {
  /**
   * Additional end point to add based on the call type.
   *
   * @property END_POINT_MAP
   * @for APIConfig
   */
  END_POINT_MAP : {
    find    : "get",
    findAll : "getAll",
    create  : "create",
    update  : "update",
    delete  : "delete",
  },

  /**
   * Enable additional end point appending.
   *
   * @property ENABLE_END_POINT
   * @default 0
   * @for APIConfig
   */
  ENABLE_END_POINT : 0,

  /**
   * Boolean to eable appending of id based on call type.
   *
   * @property APPEND_ID_MAP
   * @for APIConfig
   */
  APPEND_ID_MAP : {
    find    : 1,
    findAll : 0,
    create  : 0,
    update  : 1,
    delete  : 1,
  },

  /**
   * Enable appending of id.
   *
   * @property APPEND_ID
   * @default 1
   * @for APIConfig
   */
  APPEND_ID : 1,

  /**
   * http(s) method based on call type.
   *
   * @property HTTP_METHOD_MAP
   * @for APIConfig
   */
  HTTP_METHOD_MAP : {
    find    : "GET",
    findAll : "GET",
    create  : "POST",
    update  : "PUT",
    delete  : "DELETE",
  },

  /**
   * Base for the api.
   *
   * @property API_BASE
   * @for APIConfig
   */
  API_BASE : "",
};

/**
 * ApplicationAdapter for CRUD adapter. Not used direcrlty.
 *
 * @class ApplicationAdapter
 * @for CrudAdapter
 */
var ApplicationAdapter = DS.RESTAdapter.extend({
  getQueryParams : function(type, query, record, inBody) {
    var extraParams = {};
    //delete generated field
    if(!type.retainId) delete query.id;
    if(inBody) {
      //only sent for create / update
      for(var i = 0; i < type.ignoreFieldsOnCreateUpdate.length; i++) {
        delete query[type.ignoreFieldsOnCreateUpdate[i]];
      }
      for(var i = 0; i < type.createUpdateParams.length; i++) {
        extraParams[type.createUpdateParams[i]] = record.get(type.createUpdateParams[i]) || GlobalData.get(type.createUpdateParams[i]);
        //find a better way to handle this (primary key shudnt be sent during create request)
        if(query[type.createUpdateParams[i]] == 'all') delete query[type.createUpdateParams[i]];
      }
      Ember.merge(query, extraParams);
      //return "data="+JSON.stringify(query);
      return query;
    }
    else {
      for(var i = 0; i < type.deleteParams.length; i++) {
        extraParams[type.deleteParams[i]] = record.get(type.deleteParams[i]) || GlobalData.get(type.deleteParams[i]);
        //find a better way to handle this (primary key shudnt be sent during create request)
        if(query[type.deleteParams[i]] == 'all') delete query[type.deleteParams[i]];
      }
      Ember.merge(query, extraParams);
    }
    return query;
  },

  buildFindQuery : function(type, id, query) {
    var keys = type.keys || [], ids = id.split("__");
    for(var i = 0; i < keys.length; i++) {
      query[keys[i]] = (ids.length > i ? ids[i] : "");
    }
    for(var i = 0; i < type.findParams.length; i++) {
      query[type.findParams[i]] = GlobalData.get(type.findParams[i]);
    }
    return query;
  },

  buildURL : function(type, query, requestType) {
    var 
    ty = (Ember.typeOf(type) == 'string' ? type : type.apiName || type.typeKey),
    model = (Ember.typeOf(type) == 'string' ? type : type),
    url = APIConfig.API_BASE + "/" + ty;
    if(APIConfig.APPEND_ID === 1 && APIConfig.APPEND_ID_MAP[requestType] === 1) {
      url += "/" + getId(query, model);
    }
    if(APIConfig.ENABLE_END_POINT === 1) {
      url += "/" + APIConfig.END_POINT_MAP[requestType];
    }
    return url;
  },

  createRecord : function(store, type, record) {
    var 
    data = this.serialize(record, { includeId: true }),
    query = this.getQueryParams(type, data, record, true);
    backupData(record, type, "create");
    return this.ajax(this.buildURL(type, query, "create"), APIConfig.HTTP_METHOD_MAP.create, { data : query });
  },

  find : function(store, type, id) {
    var
    query = this.buildFindQuery(type, id, {});
    return this.ajax(this.buildURL(type, query, "find"), APIConfig.HTTP_METHOD_MAP.find, { data : query });
  },

  findAll : function(store, type) {
    return this.ajax(this.buildURL(type, {}, "findAll"), APIConfig.HTTP_METHOD_MAP.find);
  },

  findQuery : function(store, type, query) {
    return this.ajax(this.buildURL(type, query, "findAll"), APIConfig.HTTP_METHOD_MAP.find, { data : query });
  },

  _findNext : function(store, type, query, id, queryType) {
    var adapter = store.adapterFor(type),
        serializer = store.serializerFor(type),
        label = "DS: Handle Adapter#find of " + type.typeKey;

    return $.ajax({
    //TODO : fix the way url built
      url : adapter.buildURL(type)+"/"+queryType,
      method : APIConfig.HTTP_METHOD_MAP.find, 
      data : { id : id, cur : Ember.get("CrudAdapter.GlobalData.cursor."+id) },
      dataType : "json",
    }).then(function(adapterPayload) {
      Ember.assert("You made a request for a " + type.typeKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
      var payload = serializer.extract(store, type, adapterPayload, id, "findNext");

      return store.push(type, payload);
    }, function(error) {
      var record = store.getById(type, id);
      record.notFound();
      throw error;
    }, "DS: Extract payload of '" + type + "'");
  },

  findNextFull : function(record, type, query) {
    type = (Ember.typeOf(type) === "string" ? record.store.modelFor(type) : type);
    backupData(record, type);
    return this._findNext(record.store, type, query, getId(record, type), "getFullNext");
  },

  findNext : function(record, type, query) {
    type = (Ember.typeOf(type) === "string" ? record.store.modelFor(type) : type);
    backupData(record, type);
    return this._findNext(record.store, type, query, getId(record, type), "getNext");
  },

  updateRecord : function(store, type, record) {
    var
    data = this.serialize(record, { includeId: true }),
    query = this.getQueryParams(type, data, record, true);
    backupData(record, type);
    return this.ajax(this.buildURL(type, query, "update"), APIConfig.HTTP_METHOD_MAP.update, { data : query });
  },

  deleteRecord : function(store, type, record) {
    var
    data = this.serialize(record, { includeId: true }),
    query = this.getQueryParams(type, {}, record);
    return this.ajax(this.buildURL(type, query, "delete"), APIConfig.HTTP_METHOD_MAP.delete, { data : this.getQueryParams(type, query, record) });
  },
});

return {
  ApplicationAdapter : ApplicationAdapter,
  GlobalData : GlobalData,
  APIConfig : APIConfig,
};

});

define('crud-adapter/retrieveBackup',[
  "ember",
  "ember_data",
  "./backupData",
  "./getId",
], function(Ember, DS, BackupData, getId) {
getId = getId.getId;

/**
 * Method to retrieve backed up data for a record when server doesnt return the full data.
 *
 * @method retrieveBackup
 * @for CrudAdaptor
 * @param {Object} hash Data returned by server.
 * @param {Class} type Model class for the record.
 * @param {Boolean} [hasId] Boolean to denote that the record has id.
 * @returns {Object} Retrieved data.
 */
var retrieveBackup = function(hash, type, hasId) {
  var backupId = hasId ? getId(hash, type) : "New",
      id = getId(hash, type) || "New";
  if(type.useIdForBackup) backupId = id;
  if(BackupData.backupDataMap[type.typeKey] && BackupData.backupDataMap[type.typeKey][backupId]) {
    var data = BackupData.backupDataMap[type.typeKey][backupId];
    delete BackupData.backupDataMap[type.typeKey][backupId];
    for(var i = 0; i < type.ignoreFieldsOnRetrieveBackup.length; i++) {
      delete data[type.ignoreFieldsOnRetrieveBackup[i]];
    }
    hash = Utils.merge(hash, data);
    type.eachRelationship(function(name, relationship) {
      if(relationship.kind === "hasMany") {
        var da = this.data[relationship.key], ha = this.hash[relationship.key];
        if(da) {
          for(var i = 0; i < da.length; i++) {
            var ele = ha.findBy(relationship.type.keys[0], da[i][relationship.type.keys[0]]);
            da[i].id = getId(da[i], relationship.type);
            if(ele) Ember.merge(ele, da[i]);
            else ha.push(da[i]);
          }
        }
      }
    }, {data : data, hash : hash});
    if(type.retrieveBackup) {
      type.retrieveBackup(hash, type, data);
    }
  }
  return hash;
};

return {
  retrieveBackup : retrieveBackup,
};

});

define('crud-adapter/applicationSerializer',[
  "ember",
  "ember_data",
  "./getId",
  "./backupData",
  "./retrieveBackup",
], function(Ember, DS, getId, backupData, retrieveBackup) {
getId = getId.getId;
var backupDataMap = backupData.backupDataMap;
backupData = backupData.backupData;
retrieveBackup = retrieveBackup.retrieveBackup;

var ModelMap = {};

/**
 * ApplicationSerializer for CRUD serializer. Not used directly.
 *
 * @class ApplicationSerializer
 * @for CrudAdapter
 */
var ApplicationSerializer = DS.RESTSerializer.extend({
  serializeRelations : function(type, payload, data, parent) {
    type.preSerializeRelations(data);
    type.eachRelationship(function(name, relationship) {
      var plural = Ember.String.pluralize(relationship.type.typeKey);
      this.payload[plural] = this.payload[plural] || [];
      if(this.data[relationship.key]) {
        if(relationship.kind === "hasMany") {
          for(var i = 0; i < this.data[relationship.key].length; i++) {
            var childData = this.data[relationship.key][i], childModel, childType;
            if(relationship.options.polymorphic) {
              childType = ModelMap[relationship.type.typeKey][this.data[relationship.key][i].type];
            }
            else {
              childType = (ModelMap[relationship.type.typeKey] && ModelMap[relationship.type.typeKey][data.type]) || relationship.type.typeKey;
            }
            childModel = this.serializer.store.modelFor(childType);
            this.serializer.serializeRelations(childModel, payload, childData, this.data);
            childData = this.serializer.normalize(childModel, childData, childType);
            this.payload[plural].push(childData);
            if(relationship.options.polymorphic) {
              this.serializer.store.push(childType, childData);
              this.data[relationship.key][i] = {
                id : childData.id,
                type : childType,
              };
            }
            else {
              this.serializer.store.push(childType, childData);
              this.data[relationship.key][i] = childData.id;
            }
          }
        }
      }
      else if(relationship.kind === "belongsTo" && parent) {
        if(relationship.options.polymorphic) {
        }
        else {
          this.data[relationship.key] = getId(parent, relationship.type);
        }
      }
    }, {payload : payload, data : data, serializer : this});
  },

  extractSingle : function(store, type, payload, id, requestType) {
    if(payload.result.status == 1) throw new Ember.Error(payload.result.message);
    if(!payload || !payload.result) throw new Ember.Error("No data returned");
    if(Ember.typeOf(payload.result.data) == 'array') payload.result.data = payload.result.data[0];

    var metadata = Ember.copy(payload.result);
    delete metadata.data;
    store.metaForType(type, metadata);

    payload[type.typeKey] = payload.result.data || {};
    retrieveBackup(payload[type.typeKey], type, requestType !== 'createRecord');
    this.normalize(type, payload[type.typeKey], type.typeKey);
    this.serializeRelations(type, payload, payload[type.typeKey]);
    delete payload.result;

    return this._super(store, type, payload, id, requestType);
  },

  extractArray : function(store, type, payload, id, requestType) {
    var plural = Ember.String.pluralize(type.typeKey);
    if(payload.result.status == 1) throw new Ember.Error(payload.result.message);
    if(!payload || !payload.result) throw new Ember.Error("No data returned");

    var metadata = Ember.copy(payload.result);
    delete metadata.data;
    store.metaForType(type, metadata);

    payload[plural] = payload.result.data || [];
    for(var i = 0; i < payload[plural].length; i++) {
      this.normalize(type, payload[plural][i], type.typeKey);
      retrieveBackup(payload[plural][i], type, requestType !== 'createRecord');
      this.serializeRelations(type, payload, payload[plural][i]);
    }
    delete payload.result;

    return this._super(store, type, payload, id, requestType);
  },

  extractFindNext : function(store, type, payload) {
    var id = getId(payload.result.data, type);
    payload.result.data[type.paginatedAttribute].replace(0, 0, backupDataMap[type.typeKey][id][type.paginatedAttribute]);
    delete backupDataMap[type.typeKey][id];
    return this.extractSingle(store, type, payload);
  },

  extractDeleteRecord : function(store, type, payload) {
    if(payload.result.status == 1) throw new Ember.Error(payload.result.message);
    return null;
  },

  extractCreateRecord : function(store, type, payload) {
    return this.extractSingle(store, type, payload, null, "createRecord");
  },

  extractFindHasMany : function(store, type, payload) {
    return this._super(store, type, payload);
  },

  extract : function(store, type, payload, id, requestType) {
    return this._super(store, type, payload, id, requestType);
  },

  normalize : function(type, hash, prop) {
    //generate id property for ember data
    hash.id = getId(hash, type);
    this.normalizeAttributes(type, hash);
    this.normalizeRelationships(type, hash);

    this.normalizeUsingDeclaredMapping(type, hash);

    if(type.normalizeFunction) {
      type.normalizeFunction(hash);
    }

    return hash;
  },

  serialize : function(record, options) {
    var json = this._super(record, options), type = record.__proto__.constructor;

    if(type.serializeFunction) {
      type.serializeFunction(record, json);
    }

    return json;
  },

  typeForRoot : function(root) {
    if(/data$/.test(root)) {
      return root;
    }
    return Ember.String.singularize(root);
  }
});

return {
  ApplicationSerializer : ApplicationSerializer,
  ModelMap : ModelMap,
};

});

define('crud-adapter/createRecordWrapper',[
  "ember",
  "ember_data",
], function(Ember, DS) {

/**
 * Wrapper to create record.
 *
 * @method createRecordWrapper
 * @for CrudAdapter
 * @param {Instance} store
 * @param {Class|String} type
 * @param {Object} data
 */
var createRecordWrapper = function(store, type, data) {
  if(data.id && store.recordIsLoaded(type, data.id)) {
    var record = store.recordForId(type, data.id);
    record.unloadRecord();
  }
  var record = store.createRecord(type, data);
  record.recordReady();
  return record;
};

return {
  createRecordWrapper : createRecordWrapper,
};

});

define('crud-adapter/saveRecord',[
  "ember",
  "ember_data",
], function(Ember, DS) {

var isDirty = function(record) {
  //isDirty_alias is populated by ROSUI.AggregateFromChildren mixin with child records' isDirty
  return record.get("isDirty") || record.get("isDirty_alias");
};

var validationFailed = function(record) {
  //created a wrapper to do other stuff if needed
  return record.get("validationFailed");
};

/**
 * Wrapper to save record.
 *
 * @method saveRecord
 * @for CrudAdapter
 * @param {Instance} record
 * @param {Class|String} type Model class of the record
 */
var saveRecord = function(record, type) {
  var promise;
  //Ember.run(function() {
    promise = new Ember.RSVP.Promise(function(resolve, reject) {
      if(!record.get("isDeleted")) {
        record.eachAttribute(function(attr) {
          var val = this.get(attr);
          if(Ember.typeOf(val) === "string") {
            val = val.replace(/^\s*/, "");
            val = val.replace(/\s*$/, "");
            this.set(attr, val);
          }
        }, record);
      }
      var isNew = record.get("isNew");
      new Ember.RSVP.Promise(function(resolvei, rejecti) {
        record.save().then(function(data) {
          resolvei(data);
        }, function(message) {
          //Accessing the ember-data internal state machine directly. Might change with change in the ember-data version
          rejecti(message.message || message.statusText || message);
        });
      }).then(function(data) {
        resolve(data);
        if(!record.get("isDeleted")) {
          record.eachRelationship(function(name, relationship) {
            if(relationship.kind === "hasMany") {
              var hasManyArray = record.get(relationship.key);
              hasManyArray.then(function() {
                var map = {};
                for(var i = 0; i < hasManyArray.get("length");) {
                  var item = hasManyArray.objectAt(i), emberId = Utils.getEmberId(item);
                  if(map[emberId]) {
                    hasManyArray.removeAt(i);
                  }
                  else if(item.get("isNew")) {
                    hasManyArray.removeAt(i);
                    item.unloadRecord();
                  }
                  else {
                    map[emberId] = 1;
                    i++;
                  }
                }
              });
            }
          }, record);
          var model = record.__proto__.constructor;
          if(model.attrsByServer) {
            /* attrs returned by server are not updated on the model for some reason */
            for(var i = 0; i < model.attrsByServer.length; i++) {
              record.set(model.attrsByServer[i], record._data[model.attrsByServer[i]]);
            }
            record.adapterDidCommit();
          }
        }
      }, function(message) {
        reject(message.message || message.statusText || message);
      });
    });
  //});
  return promise;
};

return {
  saveRecord : saveRecord,
};

});

define('crud-adapter/retrieveFailure',[
  "ember",
  "ember_data",
  "lib/ember-utils-core",
  "./backupData",
  "./createRecordWrapper",
  "./getId",
], function(Ember, DS, Utils, BackupData, createRecordWrapper, getId) {
createRecordWrapper = createRecordWrapper.createRecordWrapper;
getId = getId.getId;

/**
 * Method to retrieve record from failure.
 *
 * @method retrieveFailure
 * @for CrudAdapter
 * @param {Instance} record
 */
var retrieveFailure = function(record) {
  var type = record.__proto__.constructor,
      backupId = record.get("isNew") ? "New" : record.get("id"),
      id = record.get("id") || "New";
  if(record.get("isDeleted")) {
    record.transitionTo('loaded.updated.uncommitted');
  }
  else {
    if(record.get("isNew")) {
      record.transitionTo('loaded.created.uncommitted');
    }
    else {
      record.transitionTo('loaded.updated.uncommitted');
    }
  }
  if(BackupData.backupDataMap[type.typeKey] && BackupData.backupDataMap[type.typeKey][backupId]) {
    var data = BackupData.backupDataMap[type.typeKey][backupId],
        attrs = record._inFlightAttributes;
    if(Utils.hashHasKeys(record._attributes)) {
      Utils.merge(attrs, record._attributes); 
    }
    delete BackupData.backupDataMap[type.typeKey][backupId];
    record._inFlightAttributes = {};
    for(var f in attrs) {
      record.set(f, attrs[f]);
    }
    type.eachRelationship(function(name, relationship) {
      if(relationship.kind === "hasMany") {
        var arr = this.record.get(relationship.key), darr = this.data[relationship.key];
        if(darr) {
          for(var i = 0; i < darr.length; i++) {
            var rid = getId(darr[i], relationship.type), rrec = this.record.store.getById(relationship.type, rid) || arr.objectAt(i);
            if(rrec) {
              retrieveFailure(rrec);
              if(this.record.addToProp) {
                this.record.addToProp(relationship.key, rrec);
              }
              else {
                arr.pushObject(rrec);
              }
            }
            else if(BackupData.backupDataMap[relationship.type.typeKey] && BackupData.backupDataMap[relationship.type.typeKey][rid]) {
              var crdata = BackupData.backupDataMap[relationship.type.typeKey][rid], parentKey;
              relationship.type.eachRelationship(function(name, relationship) {
                if(relationship.kind === "belongsTo") {
                  parentKey = name;
                }
              });
              if(parentKey) {
                delete crdata[parentKey];
              }
              if(!rrec) {
                this.record.addToProp(relationship.key, createRecordWrapper(this.record.store, relationship.type, crdata));
              }
              delete BackupData.backupDataMap[relationship.type.typeKey][rid];
            }
            else {
              var parentKey;
              relationship.type.eachRelationship(function(name, relationship) {
                if(relationship.kind === "belongsTo") {
                  parentKey = name;
                }
              });
              if(parentKey) {
                delete darr[i][parentKey];
              }
              this.record.addToProp(relationship.key, createRecordWrapper(this.record.store, relationship.type, darr[i]));
            }
          }
        }
      }
    }, {record : record, data : data});
  }
};

return {
  retrieveFailure : retrieveFailure,
};

});

define('crud-adapter/forceReload',[
  "ember",
  "ember_data",
  "./backupData",
], function(Ember, DS, backupData) {
backupData = backupData.backupData;

/**
 * Method to reload a record.
 *
 * @method forceReload
 * @for CrudAdapter
 * @param {Instance} store Store to reload from.
 * @param {Class} type Type of the record to reload.
 * @param {String} id Id of the record to reload.
 * @returns {Instance} Reloaded record.
 */
var forceReload = function(store, type, id) {
  if(store.recordIsLoaded(type, id)) {
    var record = store.recordForId(type, id);
    backupData(record, record.__proto__.constructor, "find");
    return record.reload();
  }
  else {
    return store.find(type, id);
  }
};

return {
  forceReload : forceReload,
};

});

define('crud-adapter/rollbackRecord',[
  "ember",
  "ember_data",
], function(Ember, DS) {

/**
 * Wrapper method to rollback a record.
 *
 * @method rollbackRecord
 * @for CrudAdapter
 * @param {Instance} record
 */
var rollbackRecord = function(record) {
  if(record.get("isError") || record.get("isInvalid") || record.get("isSaving")) {
    var attrs = record._inFlightAttributes, data = record._data;
    record._inFlightAttributes = {};
    for(var f in attrs) {
      record.set(f, data[f]);
    }
    if(record.get("isNew")) {
      record.transitionTo('loaded.created.uncommitted');
    }
    else {
      record.transitionTo('loaded.updated.uncommitted');
    }
  }
  else {
    record.rollback();
  }
  record.__proto__.constructor.eachRelationship(function(name, relationship) {
    if(relationship.kind === "hasMany") {
      var rarr = record.get(relationship.key);
      rarr.then(function() {
        rarr.forEach(function(rec) {
          rollbackRecord(rec);
        });
      });
    }
  });
};

return {
  rollbackRecord : rollbackRecord,
};

});

define('crud-adapter/delayedAddToHasManyMixin',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {


/**
 * A mixin to add objects after a hasMany relation is resolved.
 *
 * @class DelayedAddToHasManyMixin
 * @for CrudAdapter
 * @static
 */
var delayAddId = 0;
var DelayedAddToHasManyMixin = Ember.Mixin.create(Utils.ObjectWithArrayMixin, {
  recordReady : function() {
    this._super();
    Ember.set(this, "arrayPropDelayedObjs", {});
  },

  arrayPropDelayedObjs : null,

  addDelayObserverToProp : function(propKey, method) {
    method = method || "propWasUpdated";
    Ember.addObserver(this, propKey, this, method);
  },

  removeDelayObserverFromProp : function(propKey) {
    method = method || "propWasUpdated";
    Ember.removeObserver(this, propKey, this, method);
  },

  propArrayNotifyChange : function(prop, key) {
    if(prop && prop.then) {
      prop.set("canAddObjects", false);
      prop.then(function() {
        prop.set("canAddObjects", true);
      });
    }
    else {
      for(var i = 0; i < prop.get("length"); i++) {
        this[key+"WasAdded"](prop.objectAt(i), i, true);
      }
    }
  },

  /**
   * Method to add a property after the array prop loads.
   *
   * @property addToProp
   * @param {String} prop Property of array to add to.
   * @param {Instance} propObj Object to add to array.
   */
  addToProp : function(prop, propObj) {
    var arrayPropDelayedObjs = this.get("arrayPropDelayedObjs"), propArray = this.get(prop);
    if(propArray && propArray.get("canAddObjects")) {
      if(!propArray.contains(propObj)) {
        propArray.pushObject(propObj);
      }
    }
    else {
      arrayPropDelayedObjs[prop] = arrayPropDelayedObjs[prop] || [];
      if(!arrayPropDelayedObjs[prop].contains(propObj)) {
        arrayPropDelayedObjs[prop].push(propObj);
      }
    }
  },

  hasArrayProp : function(prop, findKey, findVal) {
    var arrayPropDelayedObjs = this.get("arrayPropDelayedObjs"), propArray = this.get(prop);
    if(propArray.get("canAddObjects")) {
      return !!propArray.findBy(findKey, findVal);
    }
    else if(arrayPropDelayedObjs && arrayPropDelayedObjs[prop]) {
      return !!arrayPropDelayedObjs[prop].findBy(findKey, findVal);
    }
    return false;
  },

  addToContent : function(prop) {
    var arrayPropDelayedObjs = this.get("arrayPropDelayedObjs"), propArray = this.get(prop);
    if(propArray && propArray.get("canAddObjects") && arrayPropDelayedObjs[prop]) {
      arrayPropDelayedObjs[prop].forEach(function(propObj) {
        if(!propArray.contains(propObj)) {
          propArray.pushObject(propObj);
        }
      }, propArray);
      delete arrayPropDelayedObjs[prop];
    }
  },

  /**
   * Properties that are hasMany relations.
   *
   * @property arrayProps
   * @type Array
   */
  arrayProps : null,
  arrayPropsWillBeDeleted : function(arrayProp) {
    this._super(arrayProp);
    this.removeDelayObserverFromProp(arrayProp+".canAddObjects");
    this.removeDelayObserverFromProp(arrayProp);
  },
  arrayPropWasAdded : function(arrayProp) {
    this._super(arrayProp);
    var prop = this.get(arrayProp), that = this;
    if(!this["addTo_"+arrayProp]) this["addTo_"+arrayProp] = function(propObj) {
      that.addToProp(arrayProp, propObj);
    };
    this.addDelayObserverToProp(arrayProp, function(obj, key) {
      that.addToContent(arrayProp);
    });
    this.addDelayObserverToProp(arrayProp+".canAddObjects", function(obj, key) {
      that.addToContent(arrayProp);
    });
  },

});


return {
  DelayedAddToHasManyMixin : DelayedAddToHasManyMixin,
};

});

/**
 * Wrapper module around ember data.
 *
 * @module crud-adapter
 */
define('crud-adapter/main',[
  "./model-wrapper",
  "./getId",
  "./applicationAdapter",
  "./applicationSerializer",
  "./createRecordWrapper",
  "./saveRecord",
  "./backupData",
  "./retrieveBackup",
  "./retrieveFailure",
  "./forceReload",
  "./rollbackRecord",
  "./delayedAddToHasManyMixin",
], function() {
  /**
   * Global class for crud-adapter.
   *
   * @class CrudAdapter
   */
  var CrudAdapter = Ember.Namespace.create();
  window.CrudAdapter = CrudAdapter;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        CrudAdapter[k] = arguments[i][k];
      }
    }
  }

  CrudAdapter.loadAdaptor = function(app) {
    app.ApplicationAdapter = CrudAdapter.ApplicationAdapter;
    app.ApplicationSerializer = CrudAdapter.ApplicationSerializer;
  };

  return CrudAdapter;
});

define('drag-drop/drag-drop-globals',[
], function() {

//temp solution for chrome's buggy event.dataTransfer, v31.x.x
return {
  VIEW_ID : "",
  MOVE_THRESHOLD : 2,
};

});

define('drag-drop/draggableMixin',[
  "ember",
  "lib/ember-utils-core",
  "./drag-drop-globals",
], function(Ember, Utils, DragDropGlobals) {

/**
 * A draggable mixin when included enables the view to be dragged.
 *
 * @class DragDrop.DraggableMixin
 */
var DraggableMixin = Ember.Mixin.create({
  classNames : ['dragdrop-draggable'],

  attributeBindings : 'draggable',
  draggable : 'true',
  move : true,
  dragStart : function(event) {
    var dataTransfer = event.originalEvent.dataTransfer, viewid = this.get("elementId");
    dataTransfer.setData('ViewId', viewid);
    dataTransfer.dropEffect = 'move';
    DragDropGlobals.VIEW_ID = viewid;
    if(this.get("move")) {
      var ele = this.get("element");
      this.set("mouseOffset", { left : Utils.getOffset(ele, "Left") - event.originalEvent.x, top : Utils.getOffset(ele, "Top") - event.originalEvent.y });
    }
    this.dragStartCallback(event);
    event.stopPropagation();
  },

  /**
   * A callback method that is called when a drag starts.
   *
   * @method dragStartCallback
   * @param {Object} event The event object of the dragStart event.
   */
  dragStartCallback : function(event) {
  },

  /**
   * Targets that are allowed to be dropped on. Can be a selector or an array of selectors.
   *
   * @property allowedDropTargets
   * @type String|Array
   * @default '.dragdrop-droppable'
   */
  allowedDropTargets : '.dragdrop-droppable',
});

return {
  DraggableMixin : DraggableMixin,
};

});

define('drag-drop/droppableMixin',[
  "ember",
  "lib/ember-utils-core",
  "./drag-drop-globals",
], function(Ember, Utils, DragDropGlobals) {

/**
 * A droppable mixin when included enables the view to be dropped on.
 *
 * @class DragDrop.DroppableMixin
 */
var DroppableMixin = Ember.Mixin.create({
  classNames : ['dragdrop-droppable'],

  selectorsPass : function(ele, selectors) {
    if(Ember.typeOf(selectors)  !== 'array') {
      selectors = [selectors];
    }
    for(var i = 0; i < selectors.length; i++) {
      if(!Ember.isEmpty(ele.filter(selectors[i]))) {
        return true;
      }
    }
    return false;
  },
  canInteract : function(dragView, dragEle, dropView, dropEle) {
    return this.selectorsPass(dropEle, dragView.get("allowedDropTargets")) && this.selectorsPass(dragEle, dropView.get("acceptDropFrom"));
  },

  dragEnter: function(event) {
    var dragView = Ember.View.views[DragDropGlobals.VIEW_ID], dragEle = dragView && $(dragView.get("element")),
        dropView = this, dropEle = $(event.target);
    if(dragView && this.canInteract(dragView, dragEle, dropView, dropEle)) {
      this.dragEnterCallback(event, dragView, dragEle, dropView, dropEle);
    }
    event.preventDefault();
  },
  dragOver : function(event) {
    var dragView = Ember.View.views[DragDropGlobals.VIEW_ID], dragEle = dragView && $(dragView.get("element")),
        dropView = this, dropEle = $(event.target);
    if(dragView && this.canInteract(dragView, dragEle, dropView, dropEle)) {
      this.dragOverCallback(event, dragView, dragEle, dropView, dropEle);
    }
    event.preventDefault();
  },
  dragLeave : function(event) {
    var dragView = Ember.View.views[DragDropGlobals.VIEW_ID], dragEle = dragView && $(dragView.get("element")),
        dropView = this, dropEle = $(event.target);
    if(dragView && this.canInteract(dragView, dragEle, dropView, dropEle)) {
      this.dragLeaveCallback(event, dragView, dragEle, dropView, dropEle);
    }
    event.preventDefault();
  },
  drop: function(event) {
    var dragView = Ember.View.views[DragDropGlobals.VIEW_ID], dragEle = dragView && $(dragView.get("element")),
        dropView = this, dropEle = $(event.target);
    if(dragView && this.canInteract(dragView, dragEle, dropView, dropEle)) {
      if(dragView.get("move")) {
        var mouseOffset = dragView.get("mouseOffset");
        dragEle.offset({ left : mouseOffset.left + event.originalEvent.x, top : mouseOffset.top + event.originalEvent.y });
      }
      this.dropCallback(event, dragView, dragEle, dropView, dropEle);
    }
    event.preventDefault();
  },

  /**
   * A callback method that is called when the view being dragged enters this view.
   *
   * @method dragEnterCallback
   * @param {Object} event The event object of the dragStart event.
   * @param {Class} dragView The view being dragged.
   * @param {Class} dragEle The element being dragged.
   * @param {Class} dropView The view being dropped on.
   * @param {Class} dropEle The element being dropped on.
   */
  dragEnterCallback : function(event, dragView, dragEle, dropView, dropEle) {
  },

  /**
   * A callback method that is called when the view being dragged is over this view.
   *
   * @method dragOverCallback
   * @param {Object} event The event object of the dragStart event.
   * @param {Class} dragView The view being dragged.
   * @param {Class} dragEle The element being dragged.
   * @param {Class} dropView The view being dropped on.
   * @param {Class} dropEle The element being dropped on.
   */
  dragOverCallback : function(event, dragView, dragEle, dropView, dropEle) {
  },

  /**
   * A callback method that is called when the view being dragged leaves this view.
   *
   * @method dragLeaveCallback
   * @param {Object} event The event object of the dragStart event.
   * @param {Class} dragView The view being dragged.
   * @param {Class} dragEle The element being dragged.
   * @param {Class} dropView The view being dropped on.
   * @param {Class} dropEle The element being dropped on.
   */
  dragLeaveCallback : function(event, dragView, dragEle, dropView, dropEle) {
  },

  /**
   * A callback method that is called when the view being dragged is dropped on this view.
   *
   * @method dropCallback
   * @param {Object} event The event object of the dragStart event.
   * @param {Class} dragView The view being dragged.
   * @param {Class} dragEle The element being dragged.
   * @param {Class} dropView The view being dropped on.
   * @param {Class} dropEle The element being dropped on.
   */
  dropCallback : function(event, dragView, dragEle, dropView, dropEle) {
  },

  /**
   * Accept drops from elements passing the selectors. Can be a single selectors or an array of it.
   *
   * @property acceptDropFrom
   * @type String|Array
   * @default '.dragdrop-draggable'
   */
  acceptDropFrom : '.dragdrop-draggable',
});

return {
  DroppableMixin : DroppableMixin,
};

});

define('drag-drop/sortableDraggableMixin',[
  "ember",
  "lib/ember-utils-core",
  "./drag-drop-globals",
  "./draggableMixin",
  "./droppableMixin",
], function(Ember, Utils, DragDropGlobals, DraggableMixin, DroppableMixin) {

/**
 * Draggable mixin for the sortable component.
 *
 * @class DragDrop.SortableDraggableMixin
 */
var SortableDraggableMixin = Ember.Mixin.create(DraggableMixin.DraggableMixin, DroppableMixin.DroppableMixin, {
  init : function() {
    this._super();
    this.set("lastXY", [0, 0]);
  },
  classNames : ['dragdrop-sortable-element'],
  //classNameBindings : Ember.computed.alias('columnDataGroup.sort.sortableDragableClassNames'),
  sortEleId : function() {
    return this.get("record."+this.get("columnDataGroup.sort.sortEleIdColumnData.key"));
  }.property("view.columnData.key"),
  sortableView : null,
  groupId : 0,
  hasElements : false,
  curGrpId : function() {
    return this.get("groupId");
  }.property('view.groupId', 'view.columnDataGroup.sort.sameLevel'),
  stateData : null,
  hierarchy : "",
  /* effective hierarchy */
  effH : function() {
    return this.get("hierarchy")+"_"+this.get("groupId");
  }.property('view.groupId', 'view.hierarchy'),
  isPlaceholder : false,
  move : false,
  calcAppendPosition : function(xy) {
    var lxy = this.get("lastXY"),
        dx = xy[0] - lxy[0], adx = Math.abs(dx),
        dy = xy[1] - lxy[1], ady = Math.abs(dy),
        rd = dx, ard = adx;
    if(ady > adx) {
      rd = dy;
      ard = ady;
    }
    if(ard > DragDropGlobals.MOVE_THRESHOLD) {
      if(rd < 0) {
        this.set("appendNext", false);
      }
      else {
        this.set("appendNext", true);
      }
      this.set("lastXY", xy);
      this.set("change", true);
    }
    else {
      this.set("change", false);
    }
  },
  dragOverCallback : function(event, dragView, dragEle, dropView, dropEle) {
    if(dropView.get("sortableView") && dragView.get("sortableView")) {
      var
      columnDataGroup = this.get("columnDataGroup"),
      sortEleIdKey = columnDataGroup.get("sort.sortEleIdColumnData.key"),

      //sortable container and it's element id of the element dropped on
      dropViewSort = dropView.get("sortableView"),
      dropViewSortId = dropViewSort.get("elementId"),
      //siblings of the element dropped on
      dropViewEles = dropViewSort.get("sortEleChildren"),
      //sort id of the element dropped on
      dropViewSortEleId = dropView.get("sortEleId"),
      //index of the element dropped on in the array of siblings
      dropViewIdx = dropViewEles.indexOf(dropViewEles.findBy( sortEleIdKey, dropViewSortEleId )),

      //sort id of the element dragged
      dragViewSortEleId = dragView.get("sortEleId"),
      //sortable container and it's element id of the element dragged
      dragViewSort = dragView.get("sortableView"),
      dragViewSortId = dragViewSort.get("elementId"),
      //siblings of the element dragged
      dragViewEles = dragViewSort.get("sortEleChildren"),
      //index of the element dragged in the array of siblings
      dragViewIdx = dragViewEles.indexOf(dragViewEles.findBy( sortEleIdKey, dragViewSortEleId )),
      dragViewData = dragViewEles[dragViewIdx];

      dragView.calcAppendPosition([event.originalEvent.x, event.originalEvent.y]);
      if(dropViewSort.get("effH") === dragViewSort.get("effH")) {
        //allow sortable on views with same hierarchy

        if(dragView.get("change")) {
          //process only if there is a change in the mouse position

          if(dropViewSortId === dragViewSortId) {
            //if both eles are from the same sortable container (siblings)

            if(dropViewSortEleId !== dragViewSortEleId && dropViewIdx !== dragViewIdx) {
              //process only if the eles are not the same
              //return;

              if(dropViewSort.get("length") == 1 && dropViewSort.objectAt(0).isPlaceholder) {
                //if there only 1 element and its a placeholder, remove it
                dropViewSort.removeAt(0);
              }

              //remove the dragged ele from its siblings array
              dropViewEles.removeAt(dragViewIdx);
              //remove the dragged ele's view from sortable container
              dropViewSort.removeAt(dragViewIdx);
              //if need to append after (calculated based on mouse position difference), increment dropViewIdx
              if(dragView.get("appendNext")) dropViewIdx++;
              //correct dropViewIdx to dropViewEles.length if needed
              if(dropViewIdx > dropViewEles.length) dropViewIdx = dropViewEles.length;
              else if(dropViewIdx === -1) dropViewIdx = 0;
              //insert the dragViewData to siblings array at the new index
              dropViewEles.insertAt(dropViewIdx, dragViewData);
              //insert the dragView to sortable container at the new index
              dropViewSort.insertAt(dropViewIdx, dragView);

              //reset the change boolean
              dragView.set("change", false);
              //stop propagation if it was processed
              event.stopPropagation();
            }
          }
          else {
            if(dropViewEles.indexOf(dragViewData) === -1 && !Utils.deepSearchArray(dragViewData, dropViewSortEleId, sortEleIdKey, columnDataGroup.get("sort.sortEleChildrenColumnData.key"))) {
              //process only if dropViewEles doesnt have dragViewData and dragViewData doesnt have dropViewSortEleId somewhere at a deeper level
              //this is to prevent a parent being dropped on its child
              //return;

              if(dropViewSort.get("length") == 1 && dropViewSort.objectAt(0).isPlaceholder) {
                //if there only 1 element and its a placeholder, remove it
                dropViewSort.removeAt(0);
              }

              //remove the dragged ele from its siblings array
              dragViewEles.removeAt(dragViewIdx);
              //remove the dragged ele's view from sortable container
              dragViewSort.removeAt(dragViewIdx);
              //if need to append after (calculated based on mouse position difference), increment dropViewIdx
              if(dragView.get("appendNext")) dropViewIdx++;
              //correct dropViewIdx to dropViewEles.length if needed
              if(dropViewIdx > dropViewEles.length) dropViewIdx = dropViewEles.length;
              else if(dropViewIdx === -1) dropViewIdx = 0;
              //insert the dragViewData to siblings array at the new index
              dropViewEles.insertAt(dropViewIdx, dragViewData);
              //update the sortable container view of the drag ele to the drop's container
              dragView.set("sortableView", dropViewSort);
              //insert the dragView to sortable container at the new index
              dropViewSort.insertAt(dropViewIdx, dragView);
              if(dragViewSort.get("length") === 0) {
                //if the drag ele's sortable container is empty, leave a placeholder in it's place
                dragViewSort.pushObject(columnDataGroup.get("sort.placeholderClass").create({
                  sortableView : dragViewSort,
                  hierarchy : dragView.get("hierarchy"),
                  groupId : dragView.get("stateData.grpId"),
                  columnDataGroup : columnDataGroup,
                }));
              }

              //reset the change boolean
              dragView.set("change", false);
              //stop propagation if it was processed
              event.stopPropagation();
            }
          }
        }
      }
    }
  },
  change : false,
  appendNext : false,
  lastXY : null,
});

return {
  SortableDraggableMixin : SortableDraggableMixin,
};

});

define('drag-drop/sortableDroppableMixin',[
  "ember",
  "lib/ember-utils-core",
  "./drag-drop-globals",
  "./droppableMixin",
  "../column-data/main",
], function(Ember, Utils, DragDropGlobals, DroppableMixin, ColumnData) {

/**
 * Droppable mixin for the sortable component.
 *
 * @class DragDrop.SortableDroppableMixin
 */
var SortableDroppableMixin = Ember.Mixin.create(DroppableMixin.DroppableMixin, {
  init : function() {
    this._super();
    this.set("stateData", this.get("stateData") || {grpId : 0});
    //console.log("new droppable create!");
    this.sortEleChildrenDidChange();
  },

  classNames : ['dragdrop-sortable-container'],
  //classNameBindings : Ember.computed.alias('columnDataGroup.sort.sortableDroppableClassNames'),

  sortEleChildren : function() {
    return this.get("record."+this.get("columnDataGroup.sort.sortEleChildrenColumnData.key"));
  }.property("view.columnDataGroup.sort.sortEleChildrenColumnData", "view.record"),
  sortEleChildrenDidChange : function() {
    var sortEleChildren = this.get("sortEleChildren"), columnDataGroup = this.get("columnDataGroup"),
        thisLen = this.get("length"), newLen = sortEleChildren.length,
        replaceLen = (newLen < thisLen ? newLen : thisLen),
        addNewLen = newLen - replaceLen,
        i = 0;
        stateData = this.get("stateData"),
        sortEleChildrenClassMap = columnDataGroup.get("sort.sortEleChildrenClassMap"),
        sortEleChildrenClassColumnData = columnDataGroup.get("sort.sortEleChildrenClassColumnData"),
        sortEleChildrenColumnGroupLookup = columnDataGroup.get("sort.sortEleChildrenColumnGroupLookup");
    for(; i < replaceLen; i++) {
      this.objectAt(i).setProperties({
        record : sortEleChildren[i],
        columnDataGroup : ColumnData.Registry.retrieve(sortEleChildren[i].get(sortEleChildrenColumnGroupLookup.get("key")), "columnDataGroup"),
        stateData : stateData,
        sortableView : this,
      });
    }
    for(; i < addNewLen; i++) {
      this.pushObject(sortEleChildrenClassMap[sortEleChildren[i].get(sortEleChildrenClassColumnData.get("key"))].create({
        record : sortEleChildren[i],
        columnDataGroup : ColumnData.Registry.retrieve(sortEleChildren[i].get(sortEleChildrenColumnGroupLookup.get("key")), "columnDataGroup"),
        stateData : stateData,
        sortableView : this,
      }));
    }
    if(sortEleChildren.length === 0) {
      this.pushObject(columnDataGroup.get("sort.placeholderClass").create({
        record : this.get("record"),
        columnDataGroup : columnDataGroup,
        stateData : stateData,
        sortableView : this,
      }));
    }
  }.observes("view.sortEleChildren"),

  elesIsEmpty : Ember.computed.empty('sortEleChildren.@each'),
  groupId : 0,
  hierarchy : "",
  stateData : null,
  /* effective hierarchy */
  effH : function() {
    return this.get("hierarchy")+"_"+this.get("groupId");
  }.property('view.groupId', 'view.hierarchy'),
  isPlaceholder : false,
});

return {
  SortableDroppableMixin : SortableDroppableMixin,
};

});

define('drag-drop/sortablePlaceholderMixin',[
  "ember",
  "lib/ember-utils-core",
  "./drag-drop-globals",
  "./draggableMixin",
  "./droppableMixin",
], function(Ember, Utils, DragDropGlobals, DraggableMixin, DroppableMixin) {

/**
 * Placeholder mixin for empty sortable list.
 *
 * @class DragDrop.SortablePlaceholderMixin
 */
var SortablePlaceholderMixin = Ember.Mixin.create(DraggableMixin.DraggableMixin, DroppableMixin.DroppableMixin, {
  init : function() {
    this._super();
  },

  isPlaceholder : true,
  move : false,

  classNames : ['dragdrop-sortable-placeholder'],
  //classNameBindings : Ember.computed.alias('columnDataGroup.sort.sortablePlaceholderClassNames'),
  columnDataGroup : null,
  sortableView : null,
  groupId : 0,
  hierarchy : "",
  /* effective hierarchy */
  effH : function() {
    return this.get("hierarchy")+"_"+this.get("groupId");
  }.property('view.groupId', 'view.hierarchy'),
  dragOverCallback : function(event, dragView, dragEle, dropView, dropEle) {
    if(dropView.get("sortableView") && dragView.get("sortableView")) {
      var
      columnDataGroup = this.get("columnDataGroup"),

      //sortable container and it's element id of the element dropped on
      dropViewSort = dropView.get("sortableView"),
      dropViewSortId = dropViewSort.get("elementId"),
      //siblings of the element dropped on
      dropViewEles = dropViewSort.get("sortEleChildren"),
      //sort id of the element dropped on
      dropViewSortEleId = dropView.get("sortEleId"),
      //index of the element dropped on in the array of siblings
      dropViewIdx = dropViewEles.indexOf(dropViewEles.findBy( columnDataGroup.get("sort.sortEleIdColumnData.key"), dropViewSortEleId)),

      //sort id of the element dragged
      dragViewSortEleId = dragView.get("sortEleId"),
      //sortable container and it's element id of the element dragged
      dragViewSort = dragView.get("sortableView"),
      dragViewSortId = dragViewSort.get("elementId"),
      //siblings of the element dragged
      dragViewEles = dragViewSort.get("sortEleChildren"),
      //index of the element dragged in the array of siblings
      dragViewIdx = dragViewEles.indexOf(dragViewEles.findBy( columnDataGroup.get("sort.sortEleIdColumnData.key"), dragViewSortEleId)),
      dragViewData = dragViewEles[dragViewIdx];

      dragView.calcAppendPosition([event.originalEvent.x, event.originalEvent.y]);
      if(dropViewSort.get("effH") === dragViewSort.get("effH")) {
        //allow sortable on views with same hierarchy

        if(dragView.get("change")) {
          //process only if there is a change in the mouse position

          if(dropViewSort.get("length") == 1 && dropViewSort.objectAt(0).isPlaceholder) {
            //if there only 1 element and its a placeholder, remove it
            dropViewSort.removeAt(0);
          }

          //remove the dragged ele from its siblings array
          dragViewEles.removeAt(dragViewIdx);
          //remove the dragged ele's view from sortable container
          dragViewSort.removeAt(dragViewIdx);
          //insert the dragViewData to siblings array at the end
          dropViewEles.pushObject(dragViewData);
          //insert the dragView to sortable container at the end
          dropViewSort.pushObject(dragView);
          //update the sortable container view of the drag ele to the drop's container
          dragView.set("sortableView", dropViewSort);

          //reset the change boolean
          dragView.set("change", false);
          //stop propagation if it was processed
          event.stopPropagation();
        }
      }
    }
  },
});

return {
  SortablePlaceholderMixin : SortablePlaceholderMixin,
};

});

define('drag-drop/drag-drop-column-data-interface',[
  "ember",
  "lib/ember-utils-core",
  "./drag-drop-globals",
], function(Ember, Utils, DragDropGlobals) {

/***    Sortable ColumnData Interface    ***/

var SortableColumnDataGroup = Ember.Object.extend({
  sortableDragableClassNames : [],
  sortableDroppableClassNames : [],
  sortablePlaceholderClassNames : [],

  sortEleIdColumnData : function() {
    return this.get("parentObj.columns").findBy("sort.moduleType", "sortEleId");
  }.property("parentObj.columns.@each.sort"),
  sortEleChildrenColumnData : function() {
    return this.get("parentObj.columns").findBy("sort.moduleType", "sortEleChildren");
  }.property("parentObj.columns.@each.sort"),

  sortEleChildrenClassMap : function() {
    return Ember.get(this.get("sortEleChildrenClassMapName"));
  }.property("sortEleChildrenClassMapName"),
  sortEleChildrenClassMapName : null,
  sortEleChildrenClassColumnData : function() {
    return this.get("parentObj.columns").findBy("sort.moduleType", "sortEleChildrenClass");
  }.property("parentObj.columns.@each.sort"),

  sortEleChildrenColumnGroupLookup : function() {
    return this.get("parentObj.columns").findBy("sort.moduleType", "sortEleChildrenColumnGroup");
  }.property("parentObj.columns.@each.sort"),

  placeholderClass : function() {
    return Ember.get(this.get("placeholderClassName"));
  }.property("placeholderClassName"),
  placeholderClassName : "",

  sameLevel : false,
});

var SortableEleIdColumnData = Ember.Object.extend({
});

var SortableEleChildrenColumnData = Ember.Object.extend({
});

var SortableEleChildrenClassColumnData = Ember.Object.extend({
});

var SortableEleChildrenColumnGroup = Ember.Object.extend({
});

var SortableColumnDataMap = {
  sortEleId                  : SortableEleIdColumnData,
  sortEleChildren            : SortableEleChildrenColumnData,
  sortEleChildrenClass       : SortableEleChildrenClassColumnData,
  sortEleChildrenColumnGroup : SortableEleChildrenColumnGroup,
};

return {
  SortableColumnDataGroup : SortableColumnDataGroup,
  SortableColumnDataMap : SortableColumnDataMap,
};

});

/**
 * A drag drop module for all operations related to drag and drop. Uses html5 drag drop feature.
 *
 * @module drag-drop
 */
define('drag-drop/main',[
  "./drag-drop-globals",
  "./draggableMixin",
  "./droppableMixin",
  "./sortableDraggableMixin",
  "./sortableDroppableMixin",
  "./sortablePlaceholderMixin",
  "./drag-drop-column-data-interface",
], function() {
  var DragDrop = Ember.Namespace.create();
  window.DragDrop = DragDrop;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        DragDrop[k] = arguments[i][k];
      }
    }
  }

  return DragDrop;
});

define('global-module/global-module-view/displayTextView',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
], function(Ember, Utils, ColumnData) {

/**
 * Module for a simple display of text.
 *
 * @class GlobalModules.DisplayTextView
 * @module global-module
 * @submodule global-module-view
 */
var DisplayTextView = Ember.View.extend(ColumnData.ColumnDataValueMixin, {
  /**
   * Key for the configurations on columnData.
   *
   * @property columnDataKey
   * @type String
   */
  columnDataKey : '',

  //tagName : '',

  classNameBindings : ['moduleClassName'],
  moduleClassName : function() {
    var classNames = this.get("columnData."+this.get("columnDataKey")+".classNames") || [];
    if(classNames.join) {
      classNames = classNames.join(" ");
    }
    return classNames;
  }.property("view.columnData", "view.columnDataKey"),

  template : Ember.Handlebars.compile('' +
    '{{view.value}}' +
  ''),
});

return {
  DisplayTextView : DisplayTextView,
};

});

define('global-module/global-module-view/displayTextWithTooltipView',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "./displayTextView",
], function(Ember, Utils, ColumnData, DisplayTextView) {

/**
 * Module for a simple display of text with tooltip.
 *
 * @class GlobalModules.DisplayTextWithTooltipView
 * @extends GlobalModules.DisplayTextView
 * @module global-module
 * @submodule global-module-view
 */
var DisplayTextWithTooltipView = DisplayTextView.DisplayTextView.extend({
  tooltip : function() {
    return this.get("columnData."+this.get("columnDataKey")+".tooltip") || this.get("record"+this.get("columnData."+this.get("columnDataKey")+".tooltipKey")) || "";
  }.property("view.columnData"),

  template : Ember.Handlebars.compile('' +
    '{{#tool-tip title=view.tooltip}}{{view.value}}{{/tool-tip}}' +
  ''),
});

return {
  DisplayTextWithTooltipView : DisplayTextWithTooltipView,
};

});

define('global-module/global-module-view/displayTextCollapsibleView',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "./displayTextWithTooltipView",
], function(Ember, Utils, ColumnData, DisplayTextWithTooltipView) {

/**
 * Module for a simple display of text with tooltip with connection to a collapsible module.
 *
 * @class GlobalModules.DisplayTextCollapsibleView
 * @extends GlobalModules.DisplayTextWithTooltipView
 * @module global-module
 * @submodule global-module-view
 */
var DisplayTextCollapsibleView = DisplayTextWithTooltipView.DisplayTextWithTooltipView.extend({
  groupId : null,
  groupIdHref : function() {
    return "#"+this.get("groupId");
  }.property('view.groupId'),
  collapseId : null,
  collapseIdHref : function() {
    return "#"+this.get("collapseId");
  }.property('view.collapseId'),

  template : Ember.Handlebars.compile('' +
    '<a data-toggle="collapse" {{bind-attr data-parent="view.groupIdHref" href="view.collapseIdHref"}}>' +
      '{{#tool-tip title=view.tooltip}}{{view.value}}{{/tool-tip}}' +
    '</a>' +
  ''),
});

return {
  DisplayTextCollapsibleView : DisplayTextCollapsibleView,
};

});

define('global-module/global-module-view/displayTextCollapsibleGlypiconView',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "./displayTextCollapsibleView",
], function(Ember, Utils, ColumnData, DisplayTextCollapsibleView) {

/**
 * Module for a simple display of text with tooltip with connection to a collapsible module.
 *
 * @class GlobalModules.DisplayTextCollapsibleGlypiconView
 * @extends GlobalModules.DisplayTextCollapsibleView
 * @module global-module
 * @submodule global-module-view
 */
var DisplayTextCollapsibleGlypiconView = DisplayTextCollapsibleView.DisplayTextCollapsibleView.extend({
  glyphiconCollapsed : function() {
    return this.get("columnData."+this.get("columnDataKey")+".glyphiconCollapsed");
  }.property("view.columnData", "view.columnDataKey"),
  glyphiconOpened : function() {
    return this.get("columnData."+this.get("columnDataKey")+".glyphiconCollapsed");
  }.property("view.columnData", "view.columnDataKey"),

  glyphicon : function() {
    return this.get( this.get("collapsed") ? "glyphiconCollapsed" : "glyphiconOpened" );
  }.property("view.collpased"),

  template : Ember.Handlebars.compile('' +
    '<a data-toggle="collapse" {{bind-attr data-parent="view.groupIdHref" href="view.collapseIdHref"}}>' +
      '{{#tool-tip title=view.tooltip}}<span {{bind-attr class=":glyphicon view.glyphicon"}}></span>{{/tool-tip}}' +
    '</a>' +
  ''),
});

return {
  DisplayTextCollapsibleGlypiconView : DisplayTextCollapsibleGlypiconView,
};

});

/**
 * Views for the global modules.
 *
 * @module global-module
 * @submodule global-module-view
 */
define('global-module/global-module-view/main',[
  "./displayTextView",
  "./displayTextWithTooltipView",
  "./displayTextCollapsibleView",
  "./displayTextCollapsibleGlypiconView",
], function() {
  var GlobalModulesView = Ember.Namespace.create();

  //start after DS
  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        GlobalModulesView[k] = arguments[i][k];
      }
    }
  }

  GlobalModulesView.GlobalModulesMap = {
    "displayText"                    : "globalModules/displayText",
    "displayTextWithTooltip"         : "globalModules/displayTextWithTooltip",
    "displayTextCollapsible"         : "globalModules/displayTextCollapsible",
    "displayTextCollapsibleGlypicon" : "globalModules/displayTextCollapsibleGlypicon",
  };

  return GlobalModulesView;
});

define('global-module/global-module-column-data/globalModuleColumnDataGroupMixin',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "../global-module-view/main",
], function(Ember, Utils, ColumnData, GlobalModulesView) {

/**
 * Column Data Group for global modules.
 *
 * @class GlobalModules.GlobalModuleColumnDataGroupMixin
 * @module global-module
 * @submodule global-module-column-data
 */
var GlobalModuleColumnDataGroupMixin = Ember.Mixin.create(Utils.ObjectWithArrayMixin, {
  init : function() {
    this._super();
    var arrayProps = this.get("arrayProps");
    if(!arrayProps.contains("modules")) {
      arrayProps.pushObject("modules");
    }
  },

  /**
   * The type of base module.
   *
   * @property type
   * @type String
   */
  type : "base",

  /**
   * The view type of base module.
   *
   * @property viewType
   * @type String
   * @default "base"
   */
  viewType : "base",

  /**
   * Lookup map for the base module type to view's path.
   *
   * @property modules
   * @type Array
   */
  lookupMap : null,

  viewLookup : function() {
    return this.get("lookupMap")[this.get("viewType")];
  }.property("viewType", "lookupMap"),

  arrayProps : ['modules'],

  /**
   * Modules base module supports.
   *
   * @property modules
   * @type Array
   */
  modules : null,

  modulesWillBeDeleted : function(modules, idxs) {
    for(var i = 0; i < modules.length; i++) {
      this.removeObserver(modules[i]+"Type", this, "moduleTypeDidChange");
    }
  },
  modulesWasAdded : function(modules, idxs) {
    for(var i = 0; i < modules.length; i++) {
      this.addObserver(modules[i]+"Type", this, "moduleTypeDidChange");
      this.moduleTypeDidChange(this, modules[i]+"Type");
    }
    this.columnsChanged();
  },

  moduleTypeDidChange : function(obj, moduleType) {
    var module = moduleType.match(/^(\w*)Type$/)[1];
    this.set(module+"Lookup", GlobalModulesView.GlobalModulesMap[this.get(moduleType) || "displayText"]);
  },

  columnsChanged : function() {
    var columns = this.get("parentObj.columns"), modules = this.get("modules");
    if(columns) {
      for(var i = 0; i < modules.length; i++) {
        this.set(modules[i]+"ColumnData", columns.findBy(this.get("type")+".moduleType", modules[i]));
      }
    }
  }.observes("parentObj.columns.@each"),
});

return {
  GlobalModuleColumnDataGroupMixin : GlobalModuleColumnDataGroupMixin,
};

});

define('global-module/global-module-column-data/displayTextColumnDataMixin',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "../global-module-view/main",
], function(Ember, Utils, ColumnData, GlobalModulesView) {

/**
 * Column Data for display text module.
 *
 * @class GlobalModules.DisplayTextColumnDataMixin
 * @module global-module
 * @submodule global-module-column-data
 */
var DisplayTextColumnDataMixin = Ember.Mixin.create({
  //viewType : "displayText",

  /**
   * Class names to use for the module.
   *
   * @property classNames
   * @type String
   */
  //classNames : [],

  /**
   * Tag name used by the module.
   *
   * @property tagName
   * @type String
   * @default "div"
   */
  //tagName : 'div',
});

return {
  DisplayTextColumnDataMixin : DisplayTextColumnDataMixin,
};

});

define('global-module/global-module-column-data/displayTextWithTooltipColumnDataMixin',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "../global-module-view/main",
  "./displayTextColumnDataMixin",
], function(Ember, Utils, ColumnData, GlobalModulesView, DisplayTextColumnDataMixin) {

/**
 * Column Data for display text with tooltip module.
 *
 * @class GlobalModules.DisplayTextWithTooltipColumnDataMixin
 * @module global-module
 * @submodule global-module-column-data
 */
var DisplayTextWithTooltipColumnDataMixin = Ember.Mixin.create(DisplayTextColumnDataMixin.DisplayTextColumnDataMixin, {
  //viewType : "displayTextWithTooltip",

  /**
   * Static tooltip for the module.
   *
   * @property tooltip
   * @type String
   */
  //tooltip : null,

  /**
   * Key to the value on the record for dynamic tooltip.
   *
   * @property tooltipKey
   * @type String
   */
  //tooltipKey : null,
});

return {
  DisplayTextWithTooltipColumnDataMixin : DisplayTextWithTooltipColumnDataMixin,
};

});

define('global-module/global-module-column-data/displayTextCollapsibleColumnDataMixin',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "../global-module-view/main",
  "./displayTextWithTooltipColumnDataMixin",
], function(Ember, Utils, ColumnData, GlobalModulesView, DisplayTextWithTooltipColumnDataMixin) {

/**
 * Column Data for display text collapsible module.
 *
 * @class GlobalModules.DisplayTextCollapsibleColumnDataMixin
 * @module global-module
 * @submodule global-module-column-data
 */
var DisplayTextCollapsibleColumnDataMixin = Ember.Mixin.create(DisplayTextWithTooltipColumnDataMixin.DisplayTextWithTooltipColumnDataMixin, {
  //viewType : "displayTextCollapsible",
});

return {
  DisplayTextCollapsibleColumnDataMixin : DisplayTextCollapsibleColumnDataMixin,
};

});

define('global-module/global-module-column-data/displayTextCollapsibleGlypiconColumnDataMixin',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "../global-module-view/main",
  "./displayTextCollapsibleColumnDataMixin",
], function(Ember, Utils, ColumnData, GlobalModulesView, DisplayTextCollapsibleColumnDataMixin) {

/**
 * Column Data for display text collapsible module.
 *
 * @class GlobalModules.DisplayTextCollapsibleGlypiconColumnDataMixin
 * @module global-module
 * @submodule global-module-column-data
 */
var DisplayTextCollapsibleGlypiconColumnDataMixin = Ember.Mixin.create(DisplayTextCollapsibleColumnDataMixin.DisplayTextCollapsibleColumnDataMixin, {
  //viewType : "displayTextCollapsibleGlypicon",

  /**
   * Glypicon class when open.
   *
   * @property glyphiconOpened
   * @type String
   * @default "glyphicon-chevron-down"
   */
  glyphiconOpened : "glyphicon-chevron-down",

  /**
   * Glypicon class when collapsed.
   *
   * @property glyphiconCollapsed
   * @type String
   * @default "glyphicon-chevron-down"
   */
  glyphiconCollapsed : "glyphicon-chevron-right",
});

return {
  DisplayTextCollapsibleGlypiconColumnDataMixin : DisplayTextCollapsibleGlypiconColumnDataMixin,
};

});

/**
 * Views for the global modules.
 *
 * @module global-module
 * @submodule global-module-column-data
 */
define('global-module/global-module-column-data/main',[
  "./globalModuleColumnDataGroupMixin",
  "./displayTextColumnDataMixin",
  "./displayTextWithTooltipColumnDataMixin",
  "./displayTextCollapsibleColumnDataMixin",
  "./displayTextCollapsibleGlypiconColumnDataMixin",
], function() {
  var GlobalModulesColumnData = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        GlobalModulesColumnData[k] = arguments[i][k];
      }
    }
  }

  GlobalModulesColumnData.GlobalModulesColumnDataMixinMap = {
    "displayText"                    : GlobalModulesColumnData.DisplayTextColumnDataMixin,
    "displayTextWithTooltip"         : GlobalModulesColumnData.DisplayTextWithTooltipColumnDataMixin,
    "displayTextCollapsible"         : GlobalModulesColumnData.DisplayTextCollapsibleColumnDataMixin,
    "displayTextCollapsibleGlypicon" : GlobalModulesColumnData.DisplayTextCollapsibleGlypiconColumnDataMixin,
  };

  return GlobalModulesColumnData;
});

/**
 * Global modules for certain tasks like displaying an attribute from the record.
 *
 * @module global-module
 */
define('global-module/main',[
  "./global-module-column-data/main",
  "./global-module-view/main",
], function() {
  var GlobalModules = Ember.Namespace.create();
  window.GlobalModules = GlobalModules;

  //start after DS
  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        GlobalModules[k] = arguments[i][k];
      }
    }
  }

  return GlobalModules;
});

define('list-group/listGroupView',[
  "ember",
], function(Ember) {

/**
 * A view for a list of records.
 *
 * @class ListGroup.ListGroupView
 */
var ListGroupView = Ember.View.extend({
  /**
   * The list of records.
   *
   * @property list
   * @type Array
   */
  list : null,

  /**
   * Associated column data group to customize the view.
   *
   * @property columnDataGroup
   * @type Class
   */
  columnDataGroup : null,

  classNames : ['list-group'],

  template : Ember.Handlebars.compile('' +
    '{{#with view as thatView}}' +
      '{{#each thatView.list}}' +
        '{{view thatView.columnDataGroup.list.viewLookup record=this columnDataGroup=thatView.columnDataGroup}}' +
      '{{/each}}' +
    '{{/with}}' +
  ''),
});

return {
  ListGroupView : ListGroupView,
};

});

define('list-group/list-item/listItemView',[
  "ember",
], function(Ember) {

/**
 * Basic list item view.
 *
 * @class ListGroup.ListItemView
 * @module list-group
 * @submodule list-item
 */
var ListItemView = Ember.View.extend({
  /**
   * The record that holds all the data.
   *
   * @property record
   * @type Class
   */
  record : null,

  /**
   * Associated column data group to customize the view.
   *
   * @property columnDataGroup
   * @type Class
   */
  columnDataGroup : null,

  classNames : ['list-group-item'],

  template : Ember.Handlebars.compile('' +
    '<h4 class="list-group-item-heading group-item-heading">' +
      '{{view view.columnDataGroup.list.titleLookup record=view.record columnData=view.columnDataGroup.list.titleColumnData ' +
                                                   'tagName=view.columnDataGroup.list.titleColumnData.list.tagName columnDataKey="list"}}' +
      '{{view view.columnDataGroup.list.rightBlockLookup record=view.record columnData=view.columnDataGroup.list.rightBlockColumnData ' +
                                                        'tagName=view.columnDataGroup.list.rightBlockColumnData.list.tagName columnDataKey="list"}}' +
    '</h4>' +
    '{{view view.columnDataGroup.list.descLookup record=view.record columnData=view.columnDataGroup.list.descColumnData ' +
                                                'tagName=view.columnDataGroup.list.descColumnData.list.tagName columnDataKey="list"}}' +
  ''),
});

return {
  ListItemView : ListItemView,
};

});

/**
 * Different list item views.
 *
 * @module list-group
 * @submodule list-item
 */
define('list-group/list-item/main',[
  "./listItemView",
], function() {
  var ListItem = {};

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ListItem[k] = arguments[i][k];
      }
    }
  }

  ListItem.NameToLookupMap = {
    "base" : "listGroup/listItem",
  };

  return ListItem;
});

define('list-group/list-column-data/listColumnDataGroup',[
  "ember",
  "../../global-module/main",
  "../list-item/main",
], function(Ember, GlobalModules, ListItem) {

/**
 * A column data group for the list group module.
 *
 * @class ListGroup.ListColumnDataGroup
 * @module list-group
 * @submodule list-column-data
 */
var ListColumnDataGroup = Ember.Object.extend(GlobalModules.GlobalModuleColumnDataGroupMixin, {
  type : "list",
  modules : ["title", "rightBlock", "desc"],
  lookupMap : ListItem.NameToLookupMap,

  /**
   * Type of title view.
   *
   * @property titleType
   * @type String
   * @default "displayText"
   */
  //titleType : "displayText",

  /**
   * Type of right block view.
   *
   * @property rightBlockType
   * @type String
   * @default "displayText"
   */
  //rightBlockType : "displayText",

  /**
   * Type of desc view.
   *
   * @property descType
   * @type String
   * @default "displayText"
   */
  //descType : "displayText",
});

return {
  ListColumnDataGroup : ListColumnDataGroup,
};

});

define('list-group/list-column-data/listColumnData',[
  "ember",
], function(Ember) {

/**
 * Column data for the list group modules (title, rightBlock or desc based on 'type')
 *
 * @class ListGroup.ListColumnData
 * @module list-group
 * @submodule list-column-data
 */
var ListColumnData = Ember.Object.extend({
  /**
   * Used to determine the type of the module.
   *
   * @property moduleType
   * @type String
   */
  moduleType : "",
});

var ListTitleColumnData = ListColumnData.extend({
  tagName : "span",
  classNames : ['group-item-name'],
});

var ListRightBlockColumnData = ListColumnData.extend({
  tagName : "div",
  classNames : ['pull-right', 'text-right'],
});

var ListDescColumnData = ListColumnData.extend({
  tagName : "p",
  classNames : ['list-group-item-text'],
});

var ListColumnDataMap = {
  title      : ListTitleColumnData,
  rightBlock : ListRightBlockColumnData,
  desc       : ListDescColumnData,
};

return {
  ListColumnData           : ListColumnData,
  ListTitleColumnData      : ListTitleColumnData,
  ListRightBlockColumnData : ListRightBlockColumnData,
  ListDescColumnData       : ListDescColumnData,
  ListColumnDataMap        : ListColumnDataMap,
};

});

/**
 * Different list item views.
 *
 * @module list-group
 * @submodule list-column-data
 */
define('list-group/list-column-data/main',[
  "./listColumnDataGroup",
  "./listColumnData",
], function() {
  var ListGroupItem = {};

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ListGroupItem[k] = arguments[i][k];
      }
    }
  }

  ListGroupItem.NameToLookupMap = {
    "base" : "listGroup/listItem",
  };

  return ListGroupItem;
});

/**
 * An ember wrapper module for bootstrap's list group component.
 *
 * @module list-group
 */
define('list-group/main',[
  "./listGroupView",
  "./list-item/main",
  "./list-column-data/main",
], function() {
  var ListGroup = Ember.Namespace.create();
  window.ListGroup = ListGroup;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ListGroup[k] = arguments[i][k];
      }
    }
  }

  return ListGroup;
});

define('tree/nodeRecordMixin',[
  "ember",
], function(Ember) {

/**
 * Mixin to define behaviour of a record in the tree module.
 *
 * @class Tree.NodeRecordMixin
 */
var NodeRecordMixin = Ember.Mixin.create(Ember.ActionHandler, {
  /**
   * Array of children records.
   *
   * @property children
   */
  children : null,

  columnDataGroup : function() {
    var nodeColumnData = this.get("parentObj.columnDataGroup.tree.nodeColumnData");
    if(nodeColumnData) {
      return ColumnData.Registry.retrieve(this.get(nodeColumnData.get("key")), "columnDataGroup");
    }
    return null;
  }.property("parentObj.columnDataGroup"),
});

return {
  NodeRecordMixin : NodeRecordMixin,
};

});

define('tree/tree-nodes/nodeView',[
  "ember",
], function(Ember) {

/**
 * Node view for a non leaf node.
 *
 * @class Tree.NodeView
 * @module tree
 * @submodule tree-nodes
 */
var NodeView = Ember.View.extend({
  /**
   * Record for the node.
   *
   * @property record
   * @type Class
   */
  record : null,

  /**
   * Associated column data group to customize the view.
   *
   * @property columnDataGroup
   * @type Class
   */
  columnDataGroup : null,

  classNames : ['tree-node'],

  collapseId : function() {
    return this.get("elementId")+"-inner";
  }.property("elementId"),

  collapsed : false,

  template : Ember.Handlebars.compile('' +
    '{{view view.columnDataGroup.tree.leftBarLookup record=view.record columnData=view.columnDataGroup.tree.leftBarColumnData collapseId=view.collapseId groupId=view.elementId ' +
                                                   'tagName=view.columnDataGroup.tree.leftBarColumnData.tree.tagName columnDataKey="tree" collapsed=view.collapsed}}' +
    '<div {{bind-attr class="view.columnDataGroup.tree.nodeMainClass :tree-node-main"}}>' +
      '{{view view.columnDataGroup.tree.labelLookup record=view.record columnData=view.columnDataGroup.tree.labelColumnData ' +
                                                   'tagName=view.columnDataGroup.tree.labelColumnData.tree.tagName columnDataKey="tree"}}' +
      '<div {{bind-attr id=view.collapseId class="view.columnDataGroup.tree.nodeChildrenClass :tree-node-children :collapse :in"}}>' +
        '{{#each view.record.children}}' +
          '{{view columnDataGroup.tree.nodeLookup record=this columnDataGroup=columnDataGroup}}' +
        '{{/each}}' +
      '</div>' +
    '</div>' +
    '<div class="clearfix"></div>' +
  ''),

  didInsertElement : function() {
    var ele = $(this.get("element")).find(this.get("collapseIdSelector")), that = this;
    ele.on("shown.bs.collapse", function(e) {
      Ember.run(function() {
        that.set("collapsed", false);
      });
      e.stopPropagation();
    });
    ele.on("hidden.bs.collapse", function(e) {
      Ember.run(function() {
        that.set("collapsed", true);
      });
      e.stopPropagation();
    });
  },
});

return {
  NodeView : NodeView,
};

});

define('tree/tree-nodes/leafView',[
  "ember",
  "./nodeView",
], function(Ember, NodeView) {

/**
 * Node view for a leaf node.
 *
 * @class Tree.LeafView
 * @module tree
 * @submodule tree-nodes
 */
var LeafView = NodeView.NodeView.extend({
  template : Ember.Handlebars.compile('' +
    '<div class="tree-node-leftbar leaf-node"></div>' +
    '<div {{bind-attr class="view.columnDataGroup.tree.nodeMainClass :tree-node-main :leaf-node"}}>' +
      '{{view view.columnDataGroup.tree.labelLookup record=view.record columnData=view.columnDataGroup.tree.labelColumnData ' +
                                                   'tagName=view.columnDataGroup.tree.labelColumnData.tree.tagName columnDataKey="tree"}}' +
    '</div>' +
    '<div class="clearfix"></div>' +
  ''),
});

return {
  LeafView : LeafView,
};

});

/**
 * Different node views.
 *
 * @module tree
 * @submodule tree-nodes
 */
define('tree/tree-nodes/main',[
  "../../global-module/main",
  "./nodeView",
  "./leafView",
], function(GlobalModules) {
  var TreeNodes = Ember.Namespace.create();

  for(var i = 1; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        TreeNodes[k] = arguments[i][k];
      }
    }
  }

  TreeNodes.NameToLookupMap = {
    "node" : "tree/node",
    "leaf" : "tree/leaf",
  };
  GlobalModules.GlobalModulesMap.node = "tree/node";
  GlobalModules.GlobalModulesMap.leaf = "tree/leaf";

  return TreeNodes;
});

define('tree/tree-column-data/treeColumnDataGroup',[
  "ember",
  "../../global-module/main",
  "../tree-nodes/main",
], function(Ember, GlobalModules, TreeNode) {

/**
 * A column data group for the tree module.
 *
 * @class Tree.TreeColumnDataGroup
 * @module tree
 * @submodule tree-column-data
 */
var TreeColumnDataGroup = Ember.Object.extend(GlobalModules.GlobalModuleColumnDataGroupMixin, {
  type : "tree",
  modules : ["leftBar", "label", "node"],
  lookupMap : TreeNode.NameToLookupMap,

  /**
   * Type of left bar view.
   *
   * @property leftBarType
   * @type String
   * @default "displayText"
   */
  //leftBarType : "displayTextCollapsibleGlypicon",

  /**
   * Type of label view.
   *
   * @property labelType
   * @type String
   * @default "displayText"
   */
  //labelType : "displayText",

  /**
   * Type of node view.
   *
   * @property nodeType
   * @type String
   * @default "displayText"
   */
  //nodeType : "node",
});

return {
  TreeColumnDataGroup : TreeColumnDataGroup,
};

});

define('tree/tree-column-data/treeColumnData',[
  "ember",
], function(Ember) {

/**
 * Column data for the tree modules (leftBar, label or node based on 'type')
 *
 * @class Tree.TreeColumnData
 * @module tree
 * @submodule tree-column-data
 */
var TreeColumnData = Ember.Object.extend({
});

var TreeLeftBarColumnData = TreeColumnData.extend({
  classNames : ["tree-node-leftbar"],
});

var TreeLabelColumnData = TreeColumnData.extend({
  tagName : "h4",
  classNames : ['tree-node-name'],
});

var TreeNodeColumnData = TreeColumnData.extend({
});

var TreeColumnDataMap = {
  "leftBar" : TreeLeftBarColumnData,
  "label"   : TreeLabelColumnData,
  "node"    : TreeNodeColumnData,
};

return {
  TreeColumnData        : TreeColumnData,
  TreeLeftBarColumnData : TreeLeftBarColumnData,
  TreeLabelColumnData   : TreeLabelColumnData,
  TreeNodeColumnData    : TreeNodeColumnData,
  TreeColumnDataMap     : TreeColumnDataMap,
};

});

/**
 * Column data interface for tree.
 *
 * @module tree
 * @submodule tree-column-data
 */
define('tree/tree-column-data/main',[
  "./treeColumnDataGroup",
  "./treeColumnData",
], function() {
  var TreeColumnData = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        TreeColumnData[k] = arguments[i][k];
      }
    }
  }

  return TreeColumnData;
});

/**
 * Module to show record in a tree format.
 *
 * @module tree
 */
define('tree/main',[
  "./nodeRecordMixin",
  "./tree-nodes/main",
  "./tree-column-data/main",
], function() {
  var Tree = Ember.Namespace.create();
  window.Tree = Tree;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        Tree[k] = arguments[i][k];
      }
    }
  }

  return Tree;
});

define('panels/panel-views/panelView',[
  "ember",
], function(Ember) {

/**
 * Basic panel view.
 *
 * @class Panels.PanelView
 * @module panels
 * @submodule panel-views
 */
var PanelView = Ember.View.extend({
  /**
   * The record that holds all the data.
   *
   * @property record
   * @type Class
   */
  record : null,

  /**
   * Associated column data group to customize the view.
   *
   * @property columnDataGroup
   * @type Class
   */
  columnDataGroup : null,

  classNames : ['panel', 'panel-default'],

  template : Ember.Handlebars.compile('' +
    '<div class="panel-heading">' +
      '{{view view.columnDataGroup.panel.headingLookup record=view.record columnData=view.columnDataGroup.panel.headingColumnData ' +
                                                      'tagName=view.columnDataGroup.panel.headingColumnData.list.tagName columnDataKey="panel"}}' +
    '</div>' +
    '<div class="panel-body">' +
      '{{view view.columnDataGroup.panel.bodyLookup record=view.record columnData=view.columnDataGroup.panel.bodyColumnData ' +
                                                   'tagName=view.columnDataGroup.panel.bodyColumnData.list.tagName columnDataKey="panel"}}' +
    '</div>' +
    '{{#if view.columnDataGroup.panel.footerColumnData}}' +
      '<div class="panel-footer">' +
        '{{view view.columnDataGroup.panel.footerLookup record=view.record columnData=view.columnDataGroup.panel.footerColumnData ' +
                                                       'tagName=view.columnDataGroup.panel.footerColumnData.list.tagName columnDataKey="panel"}}' +
      '</div>' +
    '{{/if}}' +
  ''),
});

return {
  PanelView : PanelView,
};

});

define('panels/panel-views/panelCollapsibleView',[
  "ember",
  "./panelView",
], function(Ember, PanelView) {

/**
 * Panel view for a collapsible.
 *
 * @class Panels.PanelCollapsibleView
 * @extends Panels.PanelView
 * @module panels
 * @submodule panel-views
 */
var PanelCollapsibleView = PanelView.PanelView.extend({
  groupId : null,
  collapseId : function() {
    return this.get("elementId")+"-inner";
  }.property('view.elementId'),
  collapseIdHref : function() {
    return "#"+this.get("collapseId");
  }.property('view.collapseId'),

  isFirst : function() {
    var panels = this.get("parentView.panels");
    return !panels || panels.objectAt(0) === this.get("record");
  }.property("view.parentView.panels.@each", "view.record"),

  template : Ember.Handlebars.compile('' +
    '<div class="panel-heading">' +
      '{{view view.columnDataGroup.panel.headingLookup record=view.record columnData=view.columnDataGroup.panel.headingColumnData collapseId=view.collapseId groupId=view.groupId '+
                                                      'tagName=view.columnDataGroup.panel.headingColumnData.list.tagName columnDataKey="panel"}}' +
    '</div>' +
    '<div {{bind-attr id="view.collapseId" class=":panel-collapse :collapse view.isFirst:in"}}>' +
      '<div class="panel-body">' +
        '{{view view.columnDataGroup.panel.bodyLookup record=view.record columnData=view.columnDataGroup.panel.bodyColumnData collapseId=view.collapseId groupId=view.groupId '+
                                                     'tagName=view.columnDataGroup.panel.bodyColumnData.list.tagName columnDataKey="panel"}}' +
      '</div>' +
      '{{#if view.columnDataGroup.panel.footerColumnData}}<div class="panel-footer">' +
        '{{view view.columnDataGroup.panel.footerLookup record=view.record columnData=view.columnDataGroup.panel.footerColumnData collapseId=view.collapseId groupId=view.groupId '+
                                                       'tagName=view.columnDataGroup.panel.footerColumnData.list.tagName columnDataKey="panel"}}' +
      '</div>{{/if}}' +
    '</div>' +
  ''),
});

return {
  PanelCollapsibleView : PanelCollapsibleView,
};

});

/**
 * Different panel views.
 *
 * @module panels
 * @submodule panel-views
 */
define('panels/panel-views/main',[
  "./panelView",
  "./panelCollapsibleView",
], function() {
  var PanelView = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        PanelView[k] = arguments[i][k];
      }
    }
  }

  PanelView.NameToLookupMap = {
    "base" : "panels/panel",
    "collapsible" : "panels/panelCollapsible",
  };

  return PanelView;
});

define('panels/panel-column-data/panelColumnDataGroup',[
  "ember",
  "../../global-module/main",
  "../panel-views/main",
], function(Ember, GlobalModules, PanelViews) {

/**
 * A column data group for the panels module.
 *
 * @class Panels.PanelColumnDataGroup
 * @module panels
 * @submodule panel-column-data
 */
var PanelColumnDataGroup = Ember.Object.extend(GlobalModules.GlobalModuleColumnDataGroupMixin, {
  type : "panel",
  modules : ["heading", "body", "footer"],
  lookupMap : PanelViews.NameToLookupMap,

  /**
   * Type of heading view.
   *
   * @property headingType
   * @type String
   * @default "displayText"
   */
  //headingType : "displayText",

  /**
   * Type of body view.
   *
   * @property bodyType
   * @type String
   * @default "displayText"
   */
  //bodyType : "displayText",

  /**
   * Type of footer view.
   *
   * @property footerType
   * @type String
   */
  //footerType : "",
});

return {
  PanelColumnDataGroup : PanelColumnDataGroup,
};

});

define('panels/panel-column-data/panelColumnData',[
  "ember",
  "../../global-module/main",
  "../panel-views/main",
], function(Ember, GlobalModules) {

/**
 * Column data for the panels modules (heading, body and footer based on 'type')
 *
 * @class PanelGroup.PanelColumnData
 * @module panels
 * @submodule panel-column-data
 */
var PanelColumnData = Ember.Object.extend({
  /**
   * Used to determine the type of the module.
   *
   * @property moduleType
   * @type String
   */
  moduleType : "",
});

var PanelHeadingColumnData = PanelColumnData.extend({
  tagName : "h3",
  classNames : ["panel-title"],
});

var PanelBodyColumnData = PanelColumnData.extend({
});

var PanelFooterColumnData = PanelColumnData.extend({
});

var PanelColumnDataMap = {
  heading : PanelHeadingColumnData,
  body    : PanelBodyColumnData,
  footer  : PanelFooterColumnData,
};

return {
  PanelColumnData        : PanelColumnData,
  PanelHeadingColumnData : PanelHeadingColumnData,
  PanelBodyColumnData    : PanelBodyColumnData,
  PanelFooterColumnData  : PanelFooterColumnData,
  PanelColumnDataMap     : PanelColumnDataMap,
};

});

/**
 * Column data interface for panels.
 *
 * @module panels
 * @submodule panel-column-data
 */
define('panels/panel-column-data/main',[
  "./panelColumnDataGroup",
  "./panelColumnData",
], function() {
  var PanelColumnData = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        PanelColumnData[k] = arguments[i][k];
      }
    }
  }

  return PanelColumnData;
});

define('panels/panelsView',[
  "ember",
], function(Ember) {

/**
 * A view for a set of panels.
 *
 * @class Panels.PanelsView
 */
var PanelsView = Ember.View.extend({
  /**
   * The list of records.
   *
   * @property panels
   * @type Array
   */
  panels : null,

  /**
   * Associated column data group to customize the view.
   *
   * @property columnDataGroup
   * @type Class
   */
  columnDataGroup : null,

  classNames : ['panel-group'],

  template : Ember.Handlebars.compile('' +
    '{{#with view as thatView}}' +
      '{{#each thatView.panels}}' +
        '{{view thatView.columnDataGroup.panel.viewLookup record=this columnDataGroup=thatView.columnDataGroup groupId=thatView.elementId}}' +
      '{{/each}}' +
    '{{/with}}' +
  ''),
});

return {
  PanelsView : PanelsView,
};

});

/**
 * An ember wrapper module for bootstrap's list group component.
 *
 * @module panels
 */
define('panels/main',[
  "./panel-column-data/main",
  "./panel-views/main",
  "./panelsView",
], function() {
  var Panels = Ember.Namespace.create();
  window.Panels = Panels;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        Panels[k] = arguments[i][k];
      }
    }
  }

  return Panels;
});

define('lazy-display/lazyDisplayColumnDataGroup',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * Class for each pass value entry
 *
 * @class LazyDisplay.PassValueObject
 */
var PassValueObject = Ember.Object.extend({
  /**
   * Value to get from for passing values.
   *
   * @property srcObj
   * @type String|Instance
   */
  srcObj : null,

  /**
   * Key within the srcObj to get value from.
   *
   * @property srcKey
   * @type String
   */
  srcKey : "",

  /**
   * Key in the main view to put value to.
   *
   * @property tarKey
   * @type String
   */
  tarKey : "",
});

/**
 * A column data group for the lazy display module.
 *
 * @class LazyDisplay.LazyDisplayColumnDataGroup
 */
var LazyDisplayColumnDataGroup = Ember.Object.extend({
  /**
   * Height of each row.
   *
   * @property rowHeight
   * @type Number
   * @default 50
   */
  rowHeight : 50,

  /**
   * Number of extra rows to load past the area of view.
   *
   * @property rowBuffer
   * @type Number
   * @default 50
   */
  rowBuffer : 50,

  /**
   * Timeout after which the async-que job to load views past the area of view.
   *
   * @property rowLoadDelay
   * @type Number
   * @default 150
   */
  rowLoadDelay : 150,

  /**
   * Array of values to pass to the main view.
   *
   * @property passValues
   * @type Array
   */
  passValues : Utils.hasMany(PassValueObject),

  /**
   * View for the lazy display main which has the rows.
   *
   * @property lazyDisplayMainClass
   * @type String|Class
   */
  lazyDisplayMainClass : null,

  /**
   * Addtional class name for the lazyDisplayHeightWrapper view.
   *
   * @property lazyDisplayHeightWrapperClasses
   * @type Array
   */
  lazyDisplayHeightWrapperClasses : [],

  /**
   * View for the lazy display main which has the rows.
   *
   * @property lazyDisplayScrollViewClasses
   * @type Array
   */
  lazyDisplayScrollViewClasses : [],
});

return {
  LazyDisplayColumnDataGroup : LazyDisplayColumnDataGroup,
};

});

define('lazy-display/lazyDisplayScrollView',[
  "ember",
], function(Ember) {

var LazyDisplayScrollView = Ember.ContainerView.extend({
  //table with the actual rows
  init : function() {
    this._super();
    var columnDataGroup = this.get("columnDataGroup"),
        passValues = columnDataGroup.get("lazyDisplay.passValues"),
        lazyDisplayMainData = {
          rows : this.get("rows"),
          columnDataGroup : columnDataGroup,
          lazyDisplayHeightWrapper : this.get("lazyDisplayHeightWrapper"),
        }, lazyDisplayMainObj,
        mainClass = columnDataGroup.get("lazyDisplay.lazyDisplayMainClass");
    if(passValues) {
      for(var i = 0; i < passValues.length; i++) {
        var
        src = passValues[i].get("srcObj"),
        key = passValues[i].get("srcKey");
        if(src) {
          if(Ember.typeOf(src) === "string") {
            src = this.get("src");
          }
          Ember.addObserver(src, key, this, "passValueDidChange");
          lazyDisplayMainData[passValues[i].get("tarKey")] = src.get(key);
        }
      }
    }
    if(Ember.typeOf(mainClass) === "string") {
      mainClass = (this.container && this.container.lookup(mainClass)) || Ember.get(mainClass);
    }
    lazyDisplayMainObj = mainClass.create(lazyDisplayMainData);
    this.pushObject(lazyDisplayMainObj);
  },

  classNames : ['lazy-display-scroll-view'],

  columnDataGroup : null,
  lazyDisplayHeightWrapper : null,
  rows : null,
  rowsValueDidChange : function() {
    this.objectAt(0).set("rows", this.get("rows"));
  }.observes('view.rows', 'rows'),

  passValueDidChange : function(obj, key) {
    var columnDataGroup = this.get("columnDataGroup"),
        passValuePaths = columnDataGroup.get("lazyDisplay.passValuePaths"),
        passKeys = columnDataGroup.get("lazyDisplay.passKeys"),
        idx = passValuePaths.findBy(key);
    this.objectAt(0).set(passKeys[idx], Ember.get(key));
  },

  scroll : function(scrollTop) {
    var childView = this.objectAt(0),
        ele = $(this.get("element"));
    if(childView) {
      childView.scroll(scrollTop);
    }
  },

  resize : function(height) {
    var childView = this.objectAt(0),
        ele = $(this.get("element"));
    if(childView) {
      childView.resize(height);
    }
  },
});

return {
  LazyDisplayScrollView : LazyDisplayScrollView,
};

});

define('lazy-display/lazyDisplayHeightWrapperView',[
  "ember",
  "./lazyDisplayScrollView",
], function(Ember, LazyDisplayScrollView) {

var LazyDisplayHeightWrapperView = Ember.ContainerView.extend({
  //this is to set the height to the actual height before the views corresponding to the rows are loaded
  init : function() {
    this._super();
    this.pushObject(LazyDisplayScrollView.LazyDisplayScrollView.create({
    //TODO : bind the vars. not needed for now though.
      rows : this.get("rows"),
      columnDataGroup : this.get("columnDataGroup"),
      lazyDisplayHeightWrapper : this,
      classNames : this.get("columnDataGroup.lazyDisplay.lazyDisplayScrollViewClasses"),
    }));
  },
  rows : null,
  rowsValueDidChange : function() {
    this.objectAt(0).set("rows", this.get("rows"));
  }.observes('view.rows', 'rows'),
  columnDataGroup : null,
  columnDataGroupDidChange : function() {
    this.objectAt(0).set("columnDataGroup", columnDataGroup);
  }.observes('view.columnDataGroup', 'columnDataGroup'),

  classNames : ['lazy-display-height-wrapper'],

  attributeBindings : ['style'],
  style : function() {
    return "height:" + this.get("columnDataGroup.lazyDisplay.rowHeight") * this.get("rows.length") + "px;";
  }.property("view.rows.@each"),

  rowsDidChange : function() {
    this.notifyPropertyChange("style");
  },

  scroll : function(scrollTop) {
    var childView = this.objectAt(0),
        ele = $(this.get("element"));
    if(childView) {
      childView.scroll(scrollTop);
    }
  },

  resize : function(height) {
    var childView = this.objectAt(0),
        ele = $(this.get("element"));
    if(childView) {
      childView.resize(height);
    }
  },
});

return {
  LazyDisplayHeightWrapperView : LazyDisplayHeightWrapperView,
};

});

define('lazy-display/lazyDisplayView',[
  "ember",
  "./lazyDisplayColumnDataGroup",
  "./lazyDisplayHeightWrapperView",
], function(Ember, LazyDisplayColumnDataGroup, LazyDisplayHeightWrapperView) {

/**
 * Main view to be used in the templates.
 *
 * @class LazyDisplay.LazyDisplayView
 */
var LazyDisplayView = Ember.ContainerView.extend({
  //scrolling is on this
  init : function() {
    this._super();
    var columnDataGroup = this.get("columnDataGroup") || LazyDisplayColumnDataGroup.LazyDisplayColumnDataGroup.create();
    this.pushObject(LazyDisplayHeightWrapperView.LazyDisplayHeightWrapperView.create({
      rows : this.get("rows"),
      columnDataGroup : columnDataGroup,
      classNames : columnDataGroup.get("lazyDisplay.lazyDisplayHeightWrapperClasses"),
    }));
  },
  
  /**
   * The rows to be displayed lazily.
   *
   * @property rows
   * @type Array
   */
  rows : null,
  rowsDidChange : function() {
    this.objectAt(0).set("rows", this.get("rows"));
  }.observes('view.rows', 'rows'),
  
  /**
   * The column data group which will serve as a config for lazy display.
   *
   * @property rows
   * @type Array
   */
  columnDataGroup : null,
  columnDataGroupDidChange : function() {
    this.objectAt(0).set("columnDataGroup", columnDataGroup);
  }.observes('view.columnDataGroup', 'columnDataGroup'),

  classNames : ['lazy-display'],

  didInsertElement : function() {
    var ele = $(this.get("element")), childView = this.objectAt(0);
    ele.scroll(this, this.scroll);
    ele.resize(this, this.resize);
    if(childView) {
      Ember.run(function() {
        childView.scroll(ele.scrollTop());
        childView.resize(ele.height());
      });
    }
  },

  scroll : function(e) {
    var that = e.data, childView = that.objectAt(0),
        ele = $(that.get("element"));
    if(childView) {
      Ember.run(function() {
        childView.scroll(ele.scrollTop());
      });
    }
  },

  resize : function(e) {
    var that = e.data, childView = that.objectAt(0),
        ele = $(that.get("element"));
    if(childView) {
      Ember.run(function() {
        childView.resize(ele.height());
      });
    }
  },

});

return {
  LazyDisplayView : LazyDisplayView,
};

});

define('lazy-display/lazyDisplayMainMixin',[
  "ember",
  "lib/ember-utils-core",
  "../timer/main",
], function(Ember, Utils, Timer) {

var LazyDisplayMainMixin = Ember.Mixin.create(Utils.ObjectWithArrayMixin, {
  rows : null,
  lazyDisplayHeightWrapper : null,

  classNames : ['lazy-display-main'],

  arrayProps : ['rows'],

  rowsWillBeDeleted : function(deletedRows, idxs) {
    if(this._state === "destroying") return;
    var rowViews = this.filter(function(e, i, a) {
      return deletedRows.findBy("id", e.get("row.id"));
    }), that = this;
    if(rowViews.length) {
      //this.removeObjects(rowViews);
      this.rerenderRows(deletedRows);
    }
    Timer.addToQue("lazyload", 100).then(function() {
      that.get("lazyDisplayHeightWrapper").rowsDidChange();
    });
  },

  rowsWasAdded : function(addedRows, idxs) {
    if(this._state === "destroying") return;
    var that = this;
    //this.beginPropertyChanges();
    for(var i = 0; i < addedRows.length; i++) {
      var row = addedRows[i], rowView = this.findBy("row.id", row.get("id")),
          that = this, canShow = this.canShowRow(idxs[i]);
      if(rowView && !Ember.isEmpty(row.get("id"))) {
        this.removeObject(rowView);
      }
      if(canShow === 0) {
        rowView = this.getRowView(row);
      }
      else if(canShow === -1) {
        rowView = this.getDummyView(row);
      }
      else {
        break;
      }
      this.insertAt(idxs[i], rowView);
    }
    //this.endPropertyChanges();
    Timer.addToQue("lazyload", 100).then(function() {
      that.get("lazyDisplayHeightWrapper").rowsDidChange();
    });
  },

  rerenderRows : function(ignoreRows) {
    if(this._state === "destroying") return;
    ignoreRows = ignoreRows || [];
    var rows = this.get("rows"), length = rows.get("length"), j = 0,
        userType = this.get("userType"), columnData = this.get("columnData");
    for(var i = 0; i < length; i++) {
      var cview = this.objectAt(j), canShow = this.canShowRow(j),
          rowObj = rows.objectAt(i);
      if(ignoreRows.contains(rowObj)) {
        if(cview) this.removeObject(cview);
        continue;
      }
      if(canShow === 0 && (!cview || cview.rowType === 0)) {
        var row = this.getRowView(rowObj);
        if(cview) {
          this.removeAt(j);
          this.insertAt(j, row);
        }
        else {
          this.pushObject(row);
        }
      }
      else if(canShow === -1 && !cview) {
        this.insertAt(j, this.getDummyView(rowObj));
      }
      j++;
    }
  },

  scrollTop : 0,
  scrollTopDidChange : function() {
    var that = this;
    Timer.addToQue("lazyload", this.get("columnDataGroup.lazyDisplay.rowLoadDelay")).then(function() {
      that.rerenderRows();
    });
  }.observes("scrollTop", "view.scrollTop"),
  scroll : function(scrollTop) {
    this.set("scrollTop", scrollTop);
  },

  height : 0,
  heightDidChange : function() {
    var that = this;
    Timer.addToQue("lazyload", this.get("columnDataGroup.lazyDisplay.rowLoadDelay")).then(function() {
      that.rerenderRows();
    });
  }.observes("height", "view.height"),
  resize : function(height) {
    this.set("height", height);
  },

  canShowRow : function(idx) {
    var rows = this.get("rows"), length = rows.get("length"),
        scrollTop = this.get("scrollTop"), height = this.get("height"),
        columnDataGroup = this.get("columnDataGroup"),
        rowHeight = columnDataGroup.get("lazyDisplay.rowHeight"),
        rowBuffer = columnDataGroup.get("lazyDisplay.rowBuffer"),
        scrollLength = Math.round(scrollTop / rowHeight - rowBuffer),
        heightLength = height / rowHeight + 2*rowBuffer;
    //console.log(scrollTop + ".." + height + ".." + idx + ".." + scrollLength + ".." + heightLength + "..retval.." + 
    //           (idx < scrollLength ? -1 : (idx >= scrollLength && idx < scrollLength + heightLength ? 0: 1)));
    if(idx < scrollLength) return -1;
    if(idx >= scrollLength && idx < scrollLength + heightLength) return 0;
    if(idx >= scrollLength + heightLength) return 1;
    return 0;
  },
});

var LazyDisplayDummyRow = Ember.Mixin.create({
  rowType : 0,

  classNames : ['lazy-display-dummy-row'],
});

var LazyDisplayRow = Ember.Mixin.create({
  rowType : 1,

  classNames : ['lazy-display-row'],
});

return {
  LazyDisplayMainMixin : LazyDisplayMainMixin,
  LazyDisplayDummyRow  : LazyDisplayDummyRow,
  LazyDisplayRow       : LazyDisplayRow,
};

});

/**
 * A module to selective load views for a very large set of records. Will load the views around the point of view.
 *
 * @module lazy-display
 */
define('lazy-display/main',[
  "./lazyDisplayColumnDataGroup",
  "./lazyDisplayView",
  "./lazyDisplayHeightWrapperView",
  "./lazyDisplayScrollView",
  "./lazyDisplayMainMixin",
], function() {
  var LazyDisplay = Ember.Namespace.create();
  window.LazyDisplay = LazyDisplay;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        LazyDisplay[k] = arguments[i][k];
      }
    }
  }

  return LazyDisplay;
});

define('form/multiColumnMixin',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * Mixin for views with multiple child view with column data.
 *
 * @class MultiColumnMixin
 */
var MultiColumnMixin = Ember.Mixin.create({
  parentForRows : function() {
    return this;
  }.property(),

  filteredCols : function() {
    var cols = this.get("columnDataGroup.columns"), record = this.get("record"), that = this;
    if(cols) {
      return cols.filter(function(columnData) {
        return that.canAddColumnData(columnData, record);
      });
    }
    return [];
  }.property('columnDataGroup.columns.@each.form', 'view.columnDataGroup.columns.@each.form', 'record.isNew', 'view.record.isNew'),

  canAddColumnData : function(columnData, record) {
    return !columnData.get('form.isOnlyTable') && (!columnData.get("form.removeOnEdit") || !record || record.get("isNew")) && (!columnData.get("form.removeOnNew") || !record || !record.get("isNew"));
  },

  template : Ember.Handlebars.compile('' +
    '{{#with view as thatView}}' +
      '{{#each thatView.filteredCols}}' +
        '{{view form.formView record=thatView.record columnData=this labelWidthClass=thatView.columnDataGroup.form.labelWidthClass ' +
                             'inputWidthClass=thatView.columnDataGroup.form.inputWidthClass tagName=thatView.columnDataGroup.form.tagName ' +
                             'showLabel=thatView.columnDataGroup.form.showLabel parentForm=thatView.parentForRows immediateParent=thatView}}' +
      '{{/each}}' +
    '{{/with}}' +
  ''),
});

return {
  MultiColumnMixin : MultiColumnMixin,
};

});

define('form/formView',[
  "ember",
  "lib/ember-utils-core",
  "../column-data/main",
  "./multiColumnMixin",
], function(Ember, Utils, ColumnData, MultiColumnMixin) {

/**
 * Base form view.
 * Usage:
 *
 *     {{view "form/form" record=record columnDataGroup=columnDataGroup}}
 *
 * @class FormView
 */
var FormView = Ember.View.extend(MultiColumnMixin.MultiColumnMixin, ColumnData.ColumnDataChangeCollectorMixin, {
  childTagNames : 'div',
  classNames : ['form-horizontal'],
});

return {
  FormView : FormView,
};

});

define('form/form-column-data/formColumnDataGroup',[
  "ember",
  "lib/ember-utils-core",
  "../../global-module/main",
], function(Ember, Utils, GlobalModules) {

/**
 * Column data group for form.
 *
 * @class Form.FormColumnDataGroup
 * @submodule form-column-data
 * @module form
 */
var FormColumnDataGroup = Ember.Object.extend(GlobalModules.GlobalModuleColumnDataGroupMixin, {
  type : "form",
  modules : [],
  lookupMap : {},

  labelWidthClass : "col-sm-4",
  inputWidthClass : "col-sm-8",
  showLabel : true,
});

return {
  FormColumnDataGroup : FormColumnDataGroup,
};

});

define('form/form-column-data/formColumnData',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * Entry to disable/enable column based on value of another.
 *
 * @class Form.DisableForCol
 * @submodule form-column-data
 * @module form
 */
var HideForCol = Ember.Object.extend({
  name : "",
  value : "",
  keyName : "",
  //used when you need different entries for the same attr in the record
  key : function() {
    return this.get("keyName") || this.get("name");
  }.property("keyName", "name"),
  hide : false,
  show : false,
});

/**
 * Column data for form module.
 *
 * @class Form.FormColumnData
 * @submodule form-column-data
 * @module form
 */
var FormColumnData = Ember.Object.extend({
  placeholder : null,
  placeholderActual : function() {
    var placeholder = this.get("placeholder"), label = this.get("parentObj.label");
    if(placeholder) return placeholder;
    return label;
  }.property('parentObj.label', 'placeholder'),
  moduleType : "",
  formView : function() {
    return Form.TypeToCellNameMap[this.get("moduleType")];
  }.property('type'),
  fixedValue : null,
  options : [],
  data : [],
  dataValCol : "",
  dataLabelCol : "",
  bubbleValues : false,
  cantBeNull : false,
  canManipulateEntries : true,

  multiEntryContainerClass : "multi-entry-container",
  eachMultiEntryClass : "each-multi-entry",
  multiEntryClass : "multi-entry",
  showChildrenLabel : false,
  childrenLabelWidthClass : "",
  childrenInputWidthClass : "col-md-12",

  exts : Utils.hasMany(),
  hideForCols : Utils.hasMany(HideForCol),
});

return {
  FormColumnData : FormColumnData,
};

});

/**
 * Column data interface for form module.
 *
 * @submodule form-column-data
 * @module form
 */

define('form/form-column-data/main',[
  "./formColumnDataGroup",
  "./formColumnData",
], function() {
  var FormColumnData = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        FormColumnData[k] = arguments[i][k];
      }
    }
  }

  FormColumnData.FormColumnDataMap = {
    textInput              : FormColumnData.FormColumnData,
    textareaInput          : FormColumnData.FormColumnData,
    staticSelect           : FormColumnData.FormColumnData,
    dynamicSelect          : FormColumnData.FormColumnData,
    dynamicMultiSelect     : FormColumnData.FormColumnData,
    selectiveSelect        : FormColumnData.FormColumnData,
    label                  : FormColumnData.FormColumnData,
    fileUpload             : FormColumnData.FormColumnData,
    imageUpload            : FormColumnData.FormColumnData,
    csvData                : FormColumnData.FormColumnData,
    multiEntry             : FormColumnData.FormColumnData,
    multiInput             : FormColumnData.FormColumnData,
    checkBox               : FormColumnData.FormColumnData,
    textareaSelectedInput  : FormColumnData.FormColumnData,
    groupRadioButton       : FormColumnData.FormColumnData,
    groupCheckBox          : FormColumnData.FormColumnData,
    sectionHeading         : FormColumnData.FormColumnData,
  };

  return FormColumnData;
});

define('form/form-items/textInputView',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
], function(Ember, Utils, ColumnData) {

/**
 * Base input view - a text input view.
 *
 * @class Form.TextInputView
 * @module form
 * @submodule form-items
 */
var TextInputView = Ember.View.extend(ColumnData.ColumnDataValueMixin, {
  parentForm : null,
  immediateParent : null,
  parentForBubbling : Ember.computed.alias("parentForm"),

  layout : Ember.Handlebars.compile('' +
    '{{#if view.showLabelComp}}<div {{bind-attr class="view.labelClass"}} >' +
      '<label {{bind-attr for="view.columnData.name" }}>{{#if view.columnData.label}}{{view.columnData.label}}{{#if view.columnData.form.mandatory}}*{{/if}}{{/if}}</label>' +
      '{{#if view.columnData.form.helpText}}<div class="label-tooltip">' +
        '{{#tool-tip placement="right" title=view.columnData.form.helpText}}<span class="glyphicon glyphicon-question-sign"></span>{{/tool-tip}}' +
      '</div>{{/if}}' +
    '</div>{{/if}}'+
    '<div {{bind-attr class="view.inputClass"}}> {{#if view.columnData.form.fieldDescription}}<span>{{view.columnData.form.fieldDescription}}</span>{{/if}}' +
      '<div class="validateField">'+
        '{{yield}}' +
        '{{#unless view.showLabelComp}}'+
          '{{#if view.columnData.form.helpText}}<div class="label-tooltip">' +
            '{{#tool-tip placement="right" title=view.columnData.form.helpText}}<span class="glyphicon glyphicon-question-sign"></span>{{/tool-tip}}' +
          '</div>{{/if}}' +
        '{{/unless}}'+
        '{{#if view.invalid}}' +
          '{{#if view.invalidReason}}<span class="help-block text-danger">{{view.invalidReason}}</span>{{/if}}' +
        '{{/if}}' +
      '</div>'+
    '</div>' +
  ''),
  template : Ember.Handlebars.compile('{{input class="form-control" autofocus=view.columnData.form.autofocus type="text" value=view.value disabled=view.isDisabled ' +
                                                                   'placeholder=view.columnData.form.placeholderActual maxlength=view.columnData.form.maxlength}}'),
  classNames : ["form-group"],
  classNameBindings : ["columnData.form.additionalClass", "columnData.validation.validations:has-validations", "invalid:has-error", ":has-feedback", "hidden:hidden", "additionalClass"],
  attributeBindings : ["colName:data-column-name"],
  colName : Ember.computed.alias("columnData.name"),
  labelWidthClass : "col-full",
  inputWidthClass : "col-sm-8",
  showLabel : true,
  labelClass : function() {
    var columnData = this.get("columnData"), labelWidthClass = this.get("labelWidthClass");
    return "control-label "+(columnData.labelWidthClass || labelWidthClass);
  }.property("view.columnData", "view.labelWidthClass"),
  inputClass : function() {
    var columnData = this.get("columnData"), inputWidthClass = this.get("inputWidthClass");
    return "control-input "+(columnData.inputWidthClass || inputWidthClass);
  }.property("view.columnData", "view.inputWidthClass"),

  isDisabled : function() {
    var columnData = this.get("columnData"),record = this.get("record");
    this.notifyPropertyChange("value");
    return columnData.get("form.fixedValue") || ((columnData.get("form.disableOnEdit") && record && !record.get("isNew")) || (columnData.get("form.disableOnNew") && record && record.get("isNew")));
  }.property("view.columnData", "view.columnData.form.fixedValue", "view.columnData.form.disableOnEdit", "view.columnData.form.disableOnNew"),

  showLabelComp : function() {
    var columnData = this.get("columnData");
    if(columnData.showLabel === undefined ) return this.get("showLabel");
    return this.get("showLabel") && columnData.showLabel;
  }.property("showLabel", "view.columnData"),

  invalid : false,
  invalidReason : false,

  hidden : false,
  hideCheck : function(changedCol, changedValue) {
    var columnData = this.get("columnData"), record = this.get("record"),
        hideEntry = columnData.get("form.hideForCols") && columnData.get("form.hideForCols").findBy("name", changedCol.get("name"));
    changedValue = changedValue || record.get(changedCol.get("key"));
    if(hideEntry) {
      var eq = hideEntry.value === changedValue, dis = hideEntry.hide, en = hideEntry.show;
      this.set("hidden", (dis && eq) || (en && !eq));
    }
  },
  disableValidation : Ember.computed.alias("hidden"),

  listenedColumnChangedHook : function(changedCol, changedValue, oldValue) {
    this.hideCheck(changedCol, changedValue);
  },

  valueDidChange : function(value) {
  },

  prevRecord : null,
  recordChangeHook : function() {
    this.notifyPropertyChange("isDisabled");
    var hideForCols = this.get("columnData.form.hideForCols");
    if(hideForCols) {
      for(var i = 0; i < hideForCols.length; i++) {
        this.hideCheck(hideForCols[i], this.get("record."+hideForCols[i].get("key")));
      }
    }
  },
  recordRemovedHook : function(){
  },
  title : "test",
});

return {
  TextInputView : TextInputView,
};

});

define('form/form-items/textAreaView',[
  "ember",
  "lib/ember-utils-core",
  "./textInputView",
], function(Ember, Utils, TextInputView) {

/**
 * View for textarea.
 *
 * @class Form.TextAreaView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
var TextAreaView = TextInputView.TextInputView.extend({
  template : Ember.Handlebars.compile('{{textarea class="form-control" autofocus="view.columnData.form.autofocus" value=view.value disabled=view.isDisabled rows=view.columnData.rows ' +
                                                                      'cols=view.columnData.cols placeholder=view.columnData.form.placeholderActual maxlength=view.columnData.form.maxlength ' +
                                                                      'readonly=view.columnData.form.readonly}}'),
});

return {
  TextAreaView : TextAreaView,
};

});

define('form/form-items/multipleValue',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * Base for multiple value object.
 *
 * @class Form.MultipleValue
 * @module form
 * @submodule form-items
 */
var MultipleValue = Ember.Object.extend({
  value : function(key, value) {
    var columnData = this.get("columnData");
    if(arguments.length > 1) {
      if(!Ember.isNone(columnData)) {
        var validation = columnData.get("validation").validateValue(value, null, columnData.get("validation.eachValidations"));
        if(validation[0]) {
          this.set("isInvalid", true);
        }
        else {
          this.set("isInvalid", false);
        }
      }
      return value;
    }
  }.property('columnData'),
  label : "",
  isInvalid : false,
});

return {
  MultipleValue : MultipleValue,
};

});

define('form/form-items/copyValuesToObject',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/*
 * Copy values from record to object.
 *
 * @method Form.CopyValuesToObject
 * @module form
 * @submodule form-items
 */
var CopyValuesToObject = function(obj, col, record, value) {
  var copyAttrs = col.get("form.copyAttrs"),
      staticAttrs = col.get("form.staticAttrs"),
      valAttrs = col.get("form.valAttrs");
  if(copyAttrs) {
    for(var k in copyAttrs) {
      if(copyAttrs.hasOwnProperty(k)) {
        obj[copyAttrs[k]] = record.get(k);
      }
    }
  }
  if(staticAttrs) {
    for(var k in staticAttrs) {
      if(staticAttrs.hasOwnProperty(k)) {
        obj[k] = staticAttrs[k];
      }
    }
  }
  if(value && valAttrs) {
    for(var k in valAttrs) {
      if(valAttrs.hasOwnProperty(k)) {
        obj[valAttrs[k]] = value.get(k);
      }
    }
  }
};

return CopyValuesToObject;

});

define('form/form-items/copyValuesToRecord',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/*
 *
 * @module form
 * @submodule form-items
 */
var CopyValuesToRecord = function(toRecord, col, fromRecord, value) {
  var copyAttrs = col.get("form.copyAttrs"),
      staticAttrs = col.get("form.staticAttrs"),
      valAttrs = col.get("form.valAttrs");
  if(copyAttrs) {
    for(var k in copyAttrs) {
      if(copyAttrs.hasOwnProperty(k)) {
        toRecord.set(copyAttrs[k], fromRecord.get(k));
      }
    }
  }
  if(staticAttrs) {
    for(var k in staticAttrs) {
      if(staticAttrs.hasOwnProperty(k)) {
        toRecord.set(k, staticAttrs[k]);
      }
    }
  }
  if(value && valAttrs) {
    for(var k in valAttrs) {
      if(valAttrs.hasOwnProperty(k)) {
        toRecord.set(valAttrs[k], value.get(k));
      }
    }
  }
};

return CopyValuesToRecord;

});

define('form/form-items/multipleValueMixin',[
  "ember",
  "lib/ember-utils-core",
  "./multipleValue",
  "./copyValuesToObject",
  "./copyValuesToRecord",
], function(Ember, Utils, MultipleValue, CopyValuesToObject, CopyValuesToRecord) {

/**
 * Mixin which enables views to have multiple values.
 *
 * @class Form.MultipleValueMixin
 * @module form
 * @submodule form-items
 */
var MultipleValueMixin = Ember.Mixin.create({
  init : function() {
    this._super();
    var values = this.get("values");
    this.set("values", Ember.isEmpty(values) ? [] : values);
    if(this.get("value")) this.valArrayDidChange();
    else this.valuesArrayDidChange();
  },

  values : Utils.hasMany(MultipleValue.MultipleValue),

  valuesCount : function() {
    return this.get("values.length") || 0;
  }.property('values.@each'),

  valuesArrayDidChange : function() {
    if(!this.get("values") || this.get("lock")) return;
    var value = this.get("value"), values = this.get("values"),
        valLength = value && value.get("length"), valuesLength = values.get("length"),
        columnData = this.get("columnData"), record = this.get("record");
    if(value) {
      this.set("lock", true);
      values.forEach(function(val, idx) {
        var valObj = value.objectAt(idx);
        if(valObj) {
          valObj.set(columnData.get("form.arrayCol"), val.get("value"));
          CopyValuesToRecord(valObj, columnData, record, val);
        }
        else {
          var data = { /*id : columnData.get("name")+"__"+csvid++*/ };
          data[columnData.get("form.arrayCol")] = val.get("value");
          CopyValuesToObject(data, columnData, record, val);
          if(record.addToProp) {
            record.addToProp(columnData.get("key"), CrudAdapter.createRecordWrapper(record.store, columnData.get("form.arrayType"), data));
          }
          else {
            value.pushObject(CrudAdapter.createRecordWrapper(record.store, columnData.get("form.arrayType"), data));
          }
        }
      });
      if(valLength > valuesLength) {
        for(var i = valuesLength; i < valLength; i++) {
          value.popObject();
        }
      }
      this.set("lock", false);
    }
  }.observes('values.@each.value', 'view.values.@each.value'),

  valArrayDidChange : function() {
    if(this.get("lock")) return;
    var value = this.get("value"), columnData = this.get("columnData");
    if(value) {
      var values, val = this.get("value");
      values = this.valuesMultiCreateHook(value);
      this.set("lock", true);
      this.set("values", values);
      this.set("lock", false);
    }
  }.observes('value.@each', 'view.value.@each'),

  valuesMultiCreateHook : function(value) {
    if(value.map) {
      return value.map(function(e, i, a) {
        return this.valuesElementCreateHook(e);
      }, this);
    }
    return [];
  },

  valuesElementCreateHook : function(element) {
    var columnData = this.get("columnData");
    return {val : element.get(columnData.get("form.arrayCol")), columnData : columnData};
  },

  lock : false,

  valuesWereInvalid : function() {
    //for now arrayCol is present for all multi value cols
    //change this check if there are exceptions
    if(!this.get("columnData.form.arrayCol")) return;
    var values = this.get("values"),
        isInvalid = !values || values.get("length") === 0 || values.anyBy("isInvalid", true),
        record = this.get("record"), columnData = this.get("columnData");
    if(!record) return;
    if(this.get("disabled")) {
      delete record._validation[columnData.get("name")];
    }
    else {
      this.set("invalid", isInvalid);
      record._validation = record._validation || {};
      if(isInvalid) {
        record._validation[columnData.get("name")] = 1;
      }
      else {
        delete record._validation[columnData.get("name")];
      }
    }
    this.validateValue();
  }.observes('values.@each.isInvalid', 'view.values.@each.isInvalid', 'disabled', 'view.disabled'),
});

return {
  MultipleValueMixin : MultipleValueMixin,
};

});

define('form/form-items/multiEntryView',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "../../crud-adapter/main",
  "./textInputView",
  "./copyValuesToObject",
], function(Ember, Utils, ColumnData, CrudAdapter, TextInputView, CopyValuesToObject) {

/**
 * View for multiple rows of items.
 *
 * @class Form.MultiEntryView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
var mulid = 0;
var MultiEntryView = TextInputView.TextInputView.extend(ColumnData.ColumnDataChangeCollectorMixin, {
  childView : function() {
    var columnData = this.get("columnData");
    return Form.TypeToCellNameMap[columnData.get("childCol").type];
  }.property("view.columnData.childCol.type"),
  template : Ember.Handlebars.compile('' +
    '<div {{bind-attr class="view.columnData.form.multiEntryContainerClass"}}>' +
    '{{#with view as outerView}}' +
      '{{#each outerView.value}}' +
        '<div {{bind-attr class="outerView.columnData.form.eachMultiEntryClass"}}>' +
          '<div {{bind-attr class="outerView.columnData.form.multiEntryClass"}}>' +
            '{{view outerView.childView record=this columnData=outerView.columnData.childCol parentForm=outerView showLabel=outerView.columnData.form.showChildrenLabel immediateParent=outerView}}' +
          '</div>' +
          '{{#if outerView.columnData.form.canManipulateEntries}}' +
            '<div class="remove-entry" rel="tooltip" title="Delete Condition"><a {{action "deleteEntry" this target="outerView"}}>' +
              '<span class="glyphicon glyphicon-trash"></span>' +
            '</a></div>' +
            '<div class="add-entry" rel="tooltip" title="Add Condition"> <a {{action "addEntry" target="outerView"}}>'+
              '<span class="glyphicon glyphicon-plus"></span>'+
            '</a></div>'+
          '{{/if}}' +
        '</div>' +
      '{{else}}'+
        '{{#if outerView.columnData.form.canManipulateEntries}}' +
          '<div class="add-first-entry" rel="tooltip" title="Add Condition"> <a {{action "addEntry" target="outerView"}}>'+
            '<span class="glyphicon glyphicon-plus"></span>'+
          '</a></div>'+
        '{{/if}}' +
      '{{/each}}'+
    '{{/with}}' +
    '</div>'+
    '<p class="tp-rules-end-msg">{{view.columnData.form.postInputText}}</p>'
    ),

  valuesArrayDidChange : function() {
    if(this.get("record")) this.validateValue(this.get("value"));
  }.observes("value.@each", "view.value.@each"),

  actions : {
    addEntry : function() {
      var record = this.get("record"), columnData = this.get("columnData"),
          entry, value = this.get("value"), data = { /*id : columnData.get("name")+"__"+mulid++*/ };
      $('.tooltip').hide();
      CopyValuesToObject(data, columnData, record);
      entry = CrudAdapter.createRecordWrapper(record.store, columnData.get("form.arrayType"), data);
      if(!value) {
        value = [];
        this.set("value", value);
      }
      value.pushObject(entry);
    },

    deleteEntry : function(entry) {
      $('.tooltip').hide();
      var value = this.get("value");
      value.removeObject(entry);
    },
  },
});

return {
  MultiEntryView : MultiEntryView,
};

});

define('form/form-items/multiInputView',[
  "ember",
  "lib/ember-utils-core",
  "../../column-data/main",
  "../multiColumnMixin",
], function(Ember, Utils, ColumnData, MultiColumnMixin) {

/**
 * View for multiple form items.
 *
 * @class Form.MultiInputView
 * @extends Form.MultiColumnMixin
 * @module form
 * @submodule form-items
 */
var MultiInputView = Ember.View.extend(MultiColumnMixin.MultiColumnMixin, ColumnData.ColumnDataChangeCollectorMixin, {
  classNames : ['clearfix'],
  classNameBindings : ['columnData.form.additionalClass'],
  parentForRows : function() {
    if(this.get("columnData.form.propogateValChange")) {
      return this.get("parentForm");
    }
    else {
      return this;
    }
  }.property(),

  columnDataGroup : Ember.computed.alias("columnData.childColumnDataGroup"),
});

return {
  MultiInputView : MultiInputView,
};

});

define('form/form-items/emberSelectViewFix',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

Ember.Select.reopen({
  _selectionDidChangeSingle: function() {
    //overriding this to fix a problem where ember was checking the actual selected object (ember object with val and label) and not the selected value
    var el = this.get('element');
    if (!el) { return; }

    var content = this.get('content'),
        selection = this.get('selection'),
        selectionIndex = content && content.findBy && selection ? content.indexOf(content.findBy("val", selection.val)) : -1,
        prompt = this.get('prompt');

    if (prompt) { selectionIndex += 1; }
    if (el) { el.selectedIndex = selectionIndex; }
  },
});

return {
  Select : Ember.Select,
};

});

define('form/form-items/staticSelectView',[
  "ember",
  "lib/ember-utils-core",
  "./textInputView",
], function(Ember, Utils, TextInputView) {

/**
 * View for select tag with static options.
 *
 * @class Form.StaticSelectView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
//TODO : support multiple on static select (no requirement for now)
var StaticSelectView = TextInputView.TextInputView.extend({
  template : Ember.Handlebars.compile('{{view "select" class="form-control" content=view.columnData.form.options optionValuePath="content.val" optionLabelPath="content.label" ' +
                                                      'prompt=view.columnData.form.prompt value=view.value disabled=view.isDisabled maxlength=view.columnData.form.maxlength}}' +
                                      '{{#if view.helpblock}}<p class="help-block">{{view.helpblock}}</p>{{/if}}'),

  helpblock : "",
});

return {
  StaticSelectView : StaticSelectView,
};

});

define('form/form-items/dynamicSelectView',[
  "ember",
  "lib/ember-utils-core",
  "./staticSelectView",
  "./multipleValueMixin",
], function(Ember, Utils, StaticSelectView, MultipleValueMixin) {

/**
 * View for a select tag with dynamic options.
 *
 * @class Form.DynamicSelectView
 * @extends Form.StaticSelectView
 * @module form
 * @submodule form-items
 */
var DynamicSelectView = StaticSelectView.StaticSelectView.extend({
  init : function() {
    this._super();
    var columnData = this.get("columnData");
    Ember.addObserver(this,columnData.get("form.dataPath")+".@each",this,"dataDidChange");
  },

  classNameBindings : ['hideOnEmpty:hidden'],
  hideOnEmpty : false,

  selectOptions : function() {
    var columnData = this.get("columnData.form"), data = [], opts = [],
        dataPath = columnData.get("dataPath");
    if(dataPath) {
      data = Ember.get(dataPath) || this.get(dataPath);
    }
    else {
      data = columnData.data || [];
    }
    if(data) {
      data.forEach(function(item) {
        opts.push(Ember.Object.create({ val : item.get(columnData.get("dataValCol")), label : item.get(columnData.get("dataLabelCol"))}));
      }, this);
    }
    if(columnData.get("hideOnEmpty") && opts.length - columnData.get("hideEmptyBuffer") === 0) {
      this.set("hideOnEmpty", true);
    }
    else {
      this.set("hideOnEmpty", false);
    }
    return opts;
  }.property('view.columnData'),

  dataDidChange : function(){
    this.notifyPropertyChange("selectOptions");
    this.rerender();
  },

  recordChangeHook : function() {
    this._super();
    this.notifyPropertyChange("selection");
  },

  valueDidChange : function() {
    this.notifyPropertyChange("selection");
  },

  selection : function(key, value) {
    var columnData = this.get("columnData.form");
    if(arguments.length > 1) {
      this.set("value", value && columnData && value.get("val"));
      return value;
    }
    else {
      return columnData && this.get("selectOptions").findBy("val", this.get("value"));
    }
  }.property(),

  template : Ember.Handlebars.compile('{{view "select" class="form-control" content=view.selectOptions optionValuePath="content.val" optionLabelPath="content.label" ' +
                                                      'prompt=view.columnData.form.prompt selection=view.selection disabled=view.isDisabled}}'),
});

return {
  DynamicSelectView : DynamicSelectView,
};

});

define('form/form-items/dynamicMultiSelectView',[
  "ember",
  "lib/ember-utils-core",
  "./dynamicSelectView",
  "./multipleValueMixin",
], function(Ember, Utils, DynamicSelectView, MultipleValueMixin) {

/**
 * View for a select tag with dynamic options and multiple selections.
 *
 * @class Form.DynamicMultiSelectView
 * @extends Form.StaticSelectView
 * @module form
 * @submodule form-items
 */
var DynamicMultiSelectView = DynamicSelectView.DynamicSelectView.extend(MultipleValueMixin.MultipleValueMixin, Utils.ObjectWithArrayMixin, {
  init : function() {
    this._super();
    this.set("selection", []);
    this.valuesArrayDidChange_Selection();
    this.selectionArrayDidChange();
  },

  selectionLock : false,

  valuesArrayDidChange_Selection : function() {
    if(!this.get("selectionLock")) {
      var values = this.get("values");
      this.set("selectionLock", true);
      this.get("selection").replace(0, this.get("selection.length"), this.get("selectOptions").filter(function(sel) {
        return !!values.findBy("val", sel.get("val"));
      }));
    }
    else {
      this.set("selectionLock", false);
    }
  }.observes("values.@each.value", "view.values.@each.value"),

  selectionArrayDidChange : function() {
    if(!this.get("selectionLock")) {
      this.set("selectionLock", true);
      this.set("values", this.get("selection").slice());
    }
    else {
      this.set("selectionLock", false);
    }
  }.observes("selection.@each.val", "view.selection.@each.val"),

  selection : null,

  template : Ember.Handlebars.compile('{{view "select" class="form-control" content=view.selectOptions optionValuePath="content.val" optionLabelPath="content.label" ' +
                                                      'multiple="multiple" prompt=view.columnData.form.prompt selection=view.selection disabled=view.isDisabled}}'),
});

return {
  DynamicMultiSelectView : DynamicMultiSelectView,
};

});

define('form/form-items/fileUploadView',[
  "ember",
  "lib/ember-utils-core",
  "./textInputView",
], function(Ember, Utils, TextInputView) {

/**
 * Form item for a file upload input.
 *
 * @class Form.FileUploadView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
var FileUploadView = TextInputView.TextInputView.extend({
  template : Ember.Handlebars.compile('<button class="btn btn-default" {{action "loadFile" target="view"}} {{bind-attr disabled="view.disableBtn"}}>{{view.btnLabel}}</button>' +
                                      '<input class="hidden" type="file" name="files[]" {{bind-attr accept="view.columnData.form.accept"}}>'),

  disableBtn : false,
  fileName : "",

  btnLabel : function(){
    return this.get('uploadBtnLabel') || this.get('columnData').get('form.btnLabel');
  }.property('columnData.form.btnLabel', 'view.columnData.form.btnLabel'),

  postRead : function(data) {
    this.set("value", data);
  },

  postFail : function(message) {
    this.set("value", null);
  },

  change : function(event) {
    var files = event.originalEvent && event.originalEvent.target.files, that = this, columnData = this.get("columnData");
    if(files && files.length > 0 && !Ember.isEmpty(files[0])) {
      this.set("disableBtn", "disabled");
      this.set("fileName", files[0].name);
      EmberFile[columnData.get("method")](files[0]).then(function(data) {
        that.postRead(data);
        that.set("disableBtn", false);
      }, function(message) {
        that.postFail(message);
        that.set("disableBtn", false);
      });
      $(this.get("element")).find("input[type='file']")[0].value = "";
    }
  },

  actions : {
    loadFile : function() {
      fileInput = $(this.get("element")).find("input[type='file']");
      fileInput.click();
    },
  },
});

return {
  FileUploadView : FileUploadView,
};

});

define('form/form-items/imageUploadView',[
  "ember",
  "lib/ember-utils-core",
  "./fileUploadView",
], function(Ember, Utils, FileUploadView) {

/**
 * Form item to upload image.
 *
 * @class Form.ImageUploadView
 * @extends Form.FileUploadView
 * @module form
 * @submodule form-items
 */
var ImageUploadView = FileUploadView.FileUploadView.extend({
  template : Ember.Handlebars.compile('<p><button class="btn btn-default btn-sm" {{action "loadFile" target="view"}} {{bind-attr disabled="view.disableBtn"}}>{{view.columnData.form.btnLabel}}</button>' +
                                      '<input class="hidden" type="file" name="files[]" {{bind-attr accept="view.columnData.form.accept"}}></p>' +
                                      '<canvas class="hidden"></canvas>' +
                                      '<div {{bind-attr class="view.hasImage::hidden"}}>' +
                                        '<div class="image-container">' +
                                          '<div class="image-container-inner">' +
                                            '<img class="the-image" {{bind-attr src="view.imageSrc"}}>' +
                                            '<div class="image-cropper"></div>' +
                                          '</div>' +
                                        '</div>' +
                                        '<button class="btn btn-default btn-sm" {{action "cropImage" target="view"}}>Crop</button>' +
                                      '</div>' +
                                      '<div class="clearfix"></div>'),

  imageSrc : "",
  hasImage : false,

  postRead : function(data) {
    this.set("imageSrc", data);
    this.set("hasImage", true);
  },

  postFail : function(message) {
    this.set("imageSrc", null);
    this.set("hasImage", false);
  },

  didInsertElement : function() {
    this._super();
    var cropper = $(this.get("element")).find(".image-cropper");
    cropper.draggable({
      containment: "parent",
    });
    cropper.resizable({
      containment: "parent",
    });
  },

  actions : {
    cropImage : function() {
      var cropper = $(this.get("element")).find(".image-cropper"),
          x = cropper.css("left"), y = cropper.css("top"),
          h = cropper.height(), w = cropper.width(),
          canvas = $(this.get("element")).find("canvas")[0],
          context = canvas.getContext("2d");
      x = Number(x.match(/^(\d+)px$/)[1]);
      y = Number(y.match(/^(\d+)px$/)[1]);
      context.drawImage($(this.get("element")).find(".the-image")[0], x, y, h, w, 0, 0, h, w);
      this.set("value", canvas.toDataURL());
      this.set("hasImage", false);
      cropper.css("left", 0);
      cropper.css("top", 0);
      cropper.height(100);
      cropper.width(100);
    },
  },

});

return {
};

});

define('form/form-items/csvDataInputView',[
  "ember",
  "lib/ember-utils-core",
  "../../lazy-display/main",
  "./fileUploadView",
  "./multipleValueMixin",
  "./multipleValue",
], function(Ember, Utils, LazyDisplay, FileUploadView, MultipleValueMixin, MultipleValue) {

/**
 * Input to accept csv data. Can be uploaded from a file or entered manually. INCOMPLETE!
 *
 * @class Form.CSVDataInputView
 * @extends Form.FileUploadView
 * @module form
 * @submodule form-items
 */
//TODO : find a better way to set id
var csvid = 0;
var CSVDataValue = Ember.View.extend(LazyDisplay.LazyDisplayRow, {
  template : Ember.Handlebars.compile('' +
                                      '<div {{bind-attr class=":form-group view.data.isInvalid:has-error view.data.showInput:has-input view.data.showInput:has-feedback :csv-value"}}>' +
                                        '{{#if view.data.showInput}}' +
                                          '{{view Ember.TextField class="form-control input-sm" value=view.data.val}}' +
                                          '<span {{bind-attr class=":form-control-feedback"}}></span>' +
                                        '{{else}}' +
                                          '<p class="form-control-static">{{view.data.val}}</p>' +
                                        '{{/if}}' +
                                      '</div>' +
                                      ''),

  data : null,
});

var CSVEntry = MultipleValue.MultipleValue.extend({
  val : function(key, value) {
    var col = this.get("col");
    if(arguments.length > 1) {
      if(!Ember.isNone(col)) {
        var validation = col.validateValue(value, null, col.get("validation.eachValidations"));
        if(validation[0]) {
          this.set("isInvalid", true);
          if(!this.get("validated")) {
            this.set("showInput", true);
          }
        }
        else {
          this.set("isInvalid", false);
        }
        this.set("validated", true);
      }
      return value;
    }
  }.property('col'),
  showInput : false,
  validated : false,
  col : null,
});

var CSVDataDummyValue = Ember.View.extend(LazyDisplay.LazyDisplayDummyRow, {
  classNames : ["csv-dummy-value"],
  template : Ember.Handlebars.compile(''),
});

var CSVDataValues = Ember.ContainerView.extend(LazyDisplay.LazyDisplayMainMixin, {
  getRowView : function(row) {
    return CSVDataValue.create({
      data : row,
    });
  },

  getDummyView : function() {
    return CSVDataDummyValue.create();
  },
});

var CSVDataInputView = FileUploadView.FileUploadView.extend(MultipleValueMixin.MultipleValueMixin, {
  template : Ember.Handlebars.compile('' +
                                      '{{view.columnData.form.description}}' +
                                      '{{#if view.hasFile}}' +
                                        '{{view.fileName}} ({{view.valuesCount}} {{view.columnData.form.entityPlural}})' +
                                        '<button class="btn btn-link" {{action "remove" target="view"}}>Remove</button> | ' +
                                        '<button class="btn btn-link" {{action "replace" target="view"}}>Replace</button>' +
                                        '{{view "lazyDisplay/lazyDisplay" classNameBindings=":form-sm :csv-values-wrapper" columnDataGroup=view.columnDataGroup rows=view.valuesTransformed}}' +
                                      '{{else}}' +
                                        '{{textarea class="form-control" autofocus="view.columnData.form.autofocus" value=view.csvVal rows=view.columnData.rows cols=view.columnData.cols ' +
                                                                        'placeholder=view.columnData.form.placeholderActual maxlength=view.columnData.form.maxlength ' +
                                                                        'readonly=view.columnData.form.readonly}}' +
                                        '<div class="upload-help-text">'+
                                        '<button class="btn btn-default" {{action "loadFile" target="view"}} {{bind-attr disabled="view.disableBtn"}}>{{view.columnData.form.btnLabel}}</button>' +
                                        '</div>'+
                                      '{{/if}}' +
                                      '<input class="hidden" type="file" name="files[]" {{bind-attr accept="view.columnData.form.accept"}}>' +
                                      ''),

  /*lazyDisplayConfig : LazyDisplay.LazyDisplayConfig.create({
    rowHeight : 28,
    lazyDisplayMainClass : "CSVDataValues",
  }),*/
  hasFile : false,

  values : Utils.hasMany(CSVEntry),
  valuesTransformed : function() {
    var values = this.get("values"), valuesTransformed = [];
    valuesTransformed.pushObjects(values.filterBy("showInput", true));
    valuesTransformed.pushObjects(values.filterBy("showInput", false));
    //console.log("valuesTransformed");
    return valuesTransformed;
  }.property("view.values.@each.showInput", "values.@each.showInput"),
  setToValues : function(value) {
    var columnData = this.get("columnData"), values = value.split(new RegExp(columnData.get("form.splitRegex")));
    //this.set("value", value);
    for(var i = 0; i < values.length;) {
      if(Ember.isEmpty(values[i])) {
        values.splice(i, 1);
      }
      else {
        values.splice(i, 1, {columnData : columnData, value : values[i++]});
      }
    }
    this.set("values", values);
  },

  csvVal : function(key, value) {
    var columnData = this.get("columnData"), that = this;
    if(arguments.length > 1) {
      //calculate 'values' after a delay to avoid multiple calcuations for every keystroke
      Timer.addToQue("csvvalues-"+columnData.get("name"), 1500).then(function() {
        if(!that.get("isDestroyed")) {
          that.setToValues(value);
        }
      });
      return value;
    }
    else {
      var values = this.get("values");
      return values && values.mapBy("value").join(", ");
    }
  }.property("view.values.@each", "values.@each", "view.row", "row"),

  recordChangeHook : function() {
    this._super();
    this.set("hasFile", false);
    //this.set("csvVal", "");
    //this.set("values", []);
    //the validation happens after a delay. so initially set invalid to true if its a new record else false
    this.set("invalid", this.get("record.isNew"));
  },

  postRead : function(data) {
    this.setToValues(data);
    this.set("hasFile", true);
  },

  postFail : function(message) {
    this.set("hasFile", false);
  },

  actions : {
    remove : function() {
      this.set("hasFile", false);
      this.set("csvVal", "");
      this.setToValues("");
    },

    replace : function() {
      $(this.get("element")).find("input[type='file']").click();
    },
  },
});

return {
  CSVDataInputView : CSVDataInputView,
};

});

define('form/form-items/radioInputView',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * Basic radio button view.
 *
 * @class Form.RadioInputView
 * @module form
 * @submodule form-items
 */
var RadioInputView = Ember.View.extend({
  tagName : "input",
  type : "radio",
  attributeBindings : [ "name", "type", "value", "checked:checked" ],
  click : function() {
    this.set("selection", this.$().val());
  },
  checked : function() {
    return this.get("value") == this.get("selection");
  }.property('selection')
});

return {
  RadioInputView : RadioInputView,
};

});

define('form/form-items/groupRadioButtonView',[
  "ember",
  "lib/ember-utils-core",
  "./textInputView",
], function(Ember, Utils, TextInputView) {

/**
 * View for a group of radio buttons.
 *
 * @class Form.GroupRadioButtonView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
var GroupRadioButtonView = TextInputView.TextInputView.extend({
  template : Ember.Handlebars.compile('' +
    '{{#each view.columnData.form.options}}' +
      '<div {{bind-attr class="radio view.columnData.form.displayInline:radio-inline"}}>' +
        '<label>{{view "form/radioInput" name=view.groupName value=this.value selection=view.value}}<span></span>{{{this.label}}}</label>' +
      '</div>' +
    '{{/each}}' +
  ''),
  groupName : function(){
    return Utils.getEmberId(this);
  }.property(),
});


return {
  GroupRadioButtonView : GroupRadioButtonView,
};

});

define('form/form-items/checkBoxView',[
  "ember",
  "lib/ember-utils-core",
  "./textInputView",
], function(Ember, Utils, TextInputView) {

/**
 * View for checkbox input.
 *
 * @class Form.CheckBoxView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
var CheckBoxView = TextInputView.TextInputView.extend({
  template : Ember.Handlebars.compile('<div class="checkbox"><label>{{view "checkbox" checked=view.value disabled=view.isDisabled}}<label></label> {{view.columnData.form.checkboxLabel}}</label></div>'),
});

return {
  CheckBoxView : CheckBoxView,
};

});

define('form/form-items/groupCheckBoxView',[
  "ember",
  "lib/ember-utils-core",
  "./textInputView",
], function(Ember, Utils, TextInputView) {

/**
 * View for a group of checkbox which translated to a single attribute.
 *
 * @class Form.GroupCheckBoxView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
var GroupCheckBoxView = TextInputView.TextInputView.extend({
  template : Ember.Handlebars.compile('{{#each view.newCheckList}}<div {{bind-attr class="checkbox col-md-4 view.columnData.form.displayInline:checkbox-inline"}}>'
    + '<label>{{view "checkbox" checked=this.checked disabled=view.isDisabled}}<label></label> {{this.checkboxLabel}}</label></div>{{/each}}'),

  checkBoxDidChange : function (){
    var checkList = this.get("newCheckList");
    this.set("value", checkList.filterBy("checked", true).mapBy("id").join(","));
  }.observes('newCheckList.@each.checked'),

  newCheckList : function() {
    var ncl = Ember.A(), ocl = this.get("columnData.form.checkList"),
        list = this.get("record").get(this.get("columnData").name).split(",");
    for(var i = 0; i < ocl.get("length") ; i++) {
      var op = JSON.parse(JSON.stringify(ocl[i], ["checkboxLabel", "id"]));
      if(list.indexOf(op.id+"") == -1) {
        op.checked = false;
      }
      else op.checked = true;
      ncl.pushObject(Ember.Object.create(op));
    }
    return ncl;
  }.property('view.columnData.checkList'),

  notifyValChange : function(obj, value) {
    this._super();
    var list = this.get("record").get(this.get("columnData").name).split(","),
        newCheckList = this.get("newCheckList");
    if(newCheckList) {
      newCheckList.forEach(function(ele){
        if(list.indexOf(ele.get("id")+"")==-1){
          ele.set("checked",false);
        }
        else ele.set("checked",true);
      },this);
    }
  },
});

return {
  GroupCheckBoxView : GroupCheckBoxView,
};

});

define('form/form-items/labelView',[
  "ember",
  "lib/ember-utils-core",
  "./textInputView",
], function(Ember, Utils, TextInputView) {

/**
 * View to put a lable.
 *
 * @class Form.LabelView
 * @extends Form.TextInputView
 * @module form
 * @submodule form-items
 */
var LabelView = TextInputView.TextInputView.extend({
  layout : Ember.Handlebars.compile('{{yield}}'),
  template : Ember.Handlebars.compile('<label>{{view.columnData.label}}</label>'),
  columnData : null,
  record : null,
});

return {
  LabelView : LabelView,
};

});

define('form/form-items/legendView',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * View for legend tag.
 *
 * @class Form.Legend
 * @module form
 * @submodule form-items
 */
var LegendView = Ember.View.extend({
  classNameBindings : ['columnData.disabled:hidden'],
  template : Ember.Handlebars.compile('<legend>{{view.columnData.label}}</legend>'),
  columnData : null,
  record : null,
});

return {
  LegendView : LegendView,
};

});

define('form/form-items/wrapperView',[
  "ember",
  "lib/ember-utils-core",
], function(Ember, Utils) {

/**
 * Extend this to add extra content before views like Form.MultiEntryView or Form.MultiInputView.
 *
 * @class Form.WrapperView
 * @module form
 * @submodule form-items
 */
var WrapperView = Ember.View.extend({
  childView : function() {
    var columnData = this.get("columnData");
    return Form.TypeToCellNameMap[columnData.get("childCol").type];
  }.property("view.columnData.childCol.type"),
  layout : Ember.Handlebars.compile('{{yield}}'),
  template : Ember.Handlebars.compile('{{create-view view.childView record=view.record columnData=view.columnData.childCol parentForm=view.parentForm immediateParent=view.immediateParent}}'),
});

return {
  WrapperView : WrapperView,
};

});

/**
 * Module with all the form items.
 *
 * @submodule form-items
 * @module form
 */

define('form/form-items/main',[
  "./textInputView",
  "./textAreaView",
  "./multipleValue",
  "./multipleValueMixin",
  "./multiEntryView",
  "./multiInputView",
  "./emberSelectViewFix",
  "./staticSelectView",
  "./dynamicSelectView",
  "./dynamicMultiSelectView",
  "./fileUploadView",
  "./imageUploadView",
  "./csvDataInputView",
  "./radioInputView",
  "./groupRadioButtonView",
  "./checkBoxView",
  "./groupCheckBoxView",
  "./labelView",
  "./legendView",
  "./wrapperView",
], function() {
  var FormItems = Ember.Namespace.create();

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        FormItems[k] = arguments[i][k];
      }
    }
  }

  FormItems.TypeToCellNameMap = {
    textInput             : "form/textInput",
    textareaInput         : "form/textArea",
    staticSelect          : "form/staticSelect",
    dynamicSelect         : "form/dynamicSelect",
    dynamicMultiSelect    : "form/dynamicMultiSelect",
    label                 : "form/label",
    legend                : "form/legend",
    fileUpload            : "form/fileUpload",
    imageUpload           : "form/imageUpload",
    csvData               : "form/cSVDataInput",
    multiEntry            : "form/multiEntry",
    multiInput            : "form/multiInput",
    checkBox              : "form/checkBox",
    textareaSelectedInput : "form/textAreaSelected",
    groupRadioButton      : "form/groupRadioButton",
    groupCheckBox         : "form/groupCheckBox",
    sectionHeading        : "form/mediumHeading",
  };

  return FormItems;
});

/**
 * A module for a form.
 *
 * @module form
 */
define('form/main',[
  "./formView",
  "./multiColumnMixin",
  "./form-column-data/main",
  "./form-items/main",
], function() {
  var Form = Ember.Namespace.create();
  window.Form = Form;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        Form[k] = arguments[i][k];
      }
    }
  }

  return Form;
});

define('modal/modalWindowView',[
  "ember",
], function(Ember) {

/**
 * Base modal window.
 *
 * @class Modal.ModalWindowView
 */
var ModalWindowView = Ember.View.extend({
  classNames : ['modal'],
  classNameBindings : ['animate:fade'],
  /**
   * Animate modal open/close.
   *
   * @property animate
   * @type Boolean
   * @default true
   */
  animate : true,

  attributeBindings : ['titleId:aria-labelledby', 'role', 'zIndex:data-zindex', 'backdrop:data-backdrop'],

  titleId : function() {
    return this.get("elementId")+"-title";
  }.property(),

  role : 'dialog',

  loaded : true,

  /**
   * Z-index of the modal window. Use this to handle stacks of modal windows.
   *
   * @property zIndex
   * @type Number
   * @default 1000
   */
  zIndex : 1000,

  /**
   * Show a dark backdrop or not.
   *
   * @property backdrop
   * @type String
   * @default "true"
   */
  backdrop : "true",

  /**
   * Width of the modal window.
   *
   * @property width
   * @type String
   * @default "300px"
   */
  width : "600px",
  widthStyle : function() {
    return "width:"+this.get("width")+";";
  }.property('view.width', 'width'),

  messageLabel : "",
  message : "",
  template : Ember.Handlebars.compile('' +
    '<div class="modal-dialog" {{bind-attr style="view.widthStyle"}}>' +
      '<div class="modal-content" tabindex=-1>' +
        '{{view view.columnDataGroup.modal.titleLookup record=view.record columnData=view.columnDataGroup.modal.titleColumnData ' +
                                                      'tagName=view.columnDataGroup.modal.titleColumnData.modal.tagName columnDataKey="modal" ' +
                                                      'titleId=view.titleId modalView=view}}' +
        '{{view view.columnDataGroup.modal.bodyLookup record=view.record columnData=view.columnDataGroup.modal.bodyColumnData ' +
                                                     'tagName=view.columnDataGroup.modal.bodyColumnData.modal.tagName columnDataKey="modal" '+
                                                     'message=view.message messageLabel=view.messageLabel modalView=view}}' +
        '{{view view.columnDataGroup.modal.footerLookup record=view.record columnData=view.columnDataGroup.modal.footerColumnData ' +
                                                       'tagName=view.columnDataGroup.modal.footerColumnData.modal.tagName columnDataKey="modal" ' +
                                                       'modalView=view disableAlias=view.disableAlias}}' +
      '</div>' +
    '</div>'),

  /**
   * Callback called when ok is pressed.
   *
   * @method onOk
   */
  onOk : null,

  /**
   * Callback called when cancel is pressed.
   *
   * @method onCancel
   */
  onCancel : null,

  /**
   * Context to use when calling ok/cancel callbacks
   *
   * @property actionContext
   * @default {the modal view}
   */
  actionContext : null,

  fromButton : false,

  /**
   * Alias to disable the ok button.
   *
   * @property disableAlias
   * @default {'record.disableSave'}
   */
  disableAlias : Ember.computed.alias("record.disableSave"),

  showModalMesssage : function(label, message) {
    this.set("messageLabel", label);
    this.set("message", message);
  },

  showHidePromise : null,
  showHideResolve : null,
  showHideReject : null,
  showModalWindow : function(hide) {
    var ele = $(this.get("element")), that = this,
    promise = new Ember.RSVP.Promise(function(resolve, reject) {
      that.setProperties({
        showHideResolve : resolve,
        showHideReject : reject,
      });
    });
    this.set("showHidePromise", promise);
    ele.modal(hide ? "hide" : null);
    return promise;
  },
  didInsertElement : function() {
    var onCancel = this.get("onCancel"), context = this.get("actionContext") || this,
        that = this, element = $(this.get("element"));
    element.on("show.bs.modal", function(e) {
      Ember.run.begin();
    });
    element.on("shown.bs.modal", function(e) {
      Ember.run.end();
      Ember.run(function() {
        that.get("showHideResolve")();
        that.postShowHook();
      });
    });
    element.on("hide.bs.modal", function(e) {
      Ember.run(function() {
        if(!that.get("fromButton") && onCancel) {
          onCancel.call(context);
        }
        that.set("fromButton", false);
      });
      if($(e.currentTarget).hasClass("in")) {
        Ember.run.begin();
      }
    });
    element.on("hidden.bs.modal", function(e) {
      Ember.run.end();
      Ember.run(function() {
        that.get("showHideResolve")();
        that.postHideHook();
      });
    });
  },

  actions : {
    okClicked : function(event) {
      var onOk = this.get("onOk");
      this.set("fromButton", true);
      if(onOk) onOk.call(this.get("actionContext") || this);
      this.set("fromButton", false);
    },

    cancelClicked : function(event) {
      var onCancel = this.get("onCancel");
    },
  },

  onCancel : function(){
    $('.tooltip').hide();
  },

  /**
   * Callback called after the modal window is shown.
   *
   * @method postShowHook
   */
  postShowHook : function() {
  },

  /**
   * Callback called after the modal window is hidden.
   *
   * @method postHideHook
   */
  postHideHook : function() {
  },

});

/**
 * Static method to show a modal widnow using a selector.
 *
 * @method showModalWindow
 * @static
 * @param {String} modalSelector Selector to select the modal window.
 * @param {Boolean} [hide] Pass this to hide the window.
 * @returns {Promise} A promise that will resolve after the widnow is shown.
 */
ModalWindowView.showModalWindow = function(modalSelector, hide) {
  var ele = $(modalSelector), modalView = Ember.View.views[ele.attr("id")];
  return modalView.showModalWindow(hide);
};

return {
  ModalWindowView : ModalWindowView,
};

});

define('modal/formWindowView',[
  "ember",
  "./modalWindowView",
], function(Ember, ModalWindowView) {

/**
 * Modal window that encapsulates form view.
 *
 * @class Modal.FormWindowView
 * @extends Modal.ModalWindowView
 */
var FormWindowView = ModalWindowView.ModalWindowView.extend({
  /**
   * Callback called when save is successfull. 'callbackContext' is used as context.
   *
   * @method saveSuccessCallback
   * @param {Instance} record
   * @param {String} message
   * @param {String} title
   */
  saveSuccessCallback : null,

  /**
   * To close on success or not.
   *
   * @property closeOnSuccess
   * @type Boolean
   * @default true
   */
  closeOnSuccess : true,

  /**
   * Callback called when save fails. 'callbackContext' is used as context.
   *
   * @method saveFailureCallback
   * @param {Instance} record
   * @param {String} message
   * @param {String} title
   */
  saveFailureCallback : null,

  /**
   * To close on failure or not.
   *
   * @property closeOnSuccess
   * @type Boolean
   * @default false
   */
  closeOnFailure : false,

  /**
   * Context used to call the callbacks.
   *
   * @property callbackContext
   */
  callbackContext : null,

  /**
   * Status of last operation.
   *
   * @property operationStatus
   * @type {String}
   * @protected
   */
  operationStatus : "",

  messageToPass : "",

  /**
   * Callback called when form editing is cancelled. 'callbackContext' is used as context.
   *
   * @method postCancelCallback
   * @param {Instance} record
   */
  postCancelCallback : null,

  postShowHook : function() {
    if($('.modal-body:visible [autofocus]')[0]) $('.modal-body:visible [autofocus]')[0].focus();
  },
  postHideHook : function() {
    if(!Ember.isEmpty(this.get("operationStatus"))) {
      var
      isSuccess = this.get("operationStatus") === "success";
      record = this.get("record." + this.get("columnDataGroup.modal.bodyColumnData.key")),
      callbackContext = this.get("callbackContext");
      if(isSuccess && this.get("closeOnSuccess") && this.get("saveSuccessCallback")) {
        this.get("saveSuccessCallback").call(callbackContext, record, this.get("messageToPass"), record.__proto__.constructor.title || "Data");
      }
      else if(!isSuccess && this.get("closeOnFailure") && this.get("saveFailureCallback")) {
        this.get("saveFailureCallback").call(callbackContext, record, this.get("messageToPass"), record.__proto__.constructor.title || "Data");
      }
      this.set("operationStatus", "");
    }
  },

  onOk : function() {
    var
    record = this.get("record." + this.get("columnDataGroup.modal.bodyColumnData.key")),
    that = this,
    callbackContext = this.get("callbackContext");
    this.set("saving", true);
    CrudAdapter.saveRecord(record).then(function(response) {
      that.set("operationStatus", "success");
      if(that.get("closeOnSuccess")) {
        that.set("messageToPass", "Saved successfully!");
        that.set("fromButton", true);
        $(that.get("element")).modal('hide');
      }
      else if(that.get("saveSuccessCallback")) {
        that.get("saveSuccessCallback").call(callbackContext, record, "Saved successfully!", record.__proto__.constructor.title || "Data");
      }
    }, function(response) {
      that.set("operationStatus", "failure");
      CrudAdapter.retrieveFailure(record);
      CrudAdapter.backupDataMap = {};
      if(that.get("closeOnFailure")) {
        that.set("fromButton", true);
        that.set("messageToPass", response.statusText || response);
        $(that.get("element")).modal('hide');
      }
      else if(that.get("saveFailureCallback")) {
        that.get("saveFailureCallback").call(callbackContext, record, response.statusText || response, record.__proto__.constructor.title);
      }
    });
  },

  onCancel : function() {
    this._super();
    var 
    record = this.get("record." + this.get("columnDataGroup.modal.bodyColumnData.key")),
    postCancelCallback = this.get("postCancelCallback"),
    callbackContext = this.get("callbackContext");
    this.set("showAlert", false);
    if(record && !record.get("isSaving")) {
      if(record.get("isNew")) {
        record.deleteRecord();
      }
      else {
        record._validation = {};
        record.set("validationFailed", false);
        CrudAdapter.rollbackRecord(record);
      }
      if(postCancelCallback) {
        postCancelCallback.call(callbackContext, record);
      }
      this.set("record", null);
    }
    this.set("fromButton", true);
  },
});

return {
  FormWindowView : FormWindowView,
};

});

define('modal/modal-item/modalBodyView',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Body view for modal.
 *
 * @class Modal.ModalBodyView
 * @exends GlobalModules.DisplayTextView
 * @submodule modal-item
 * @module modal
 */
var ModalBodyView = GlobalModules.DisplayTextView.extend({
  messageLabel : "",
  message : "",

  layout : Ember.Handlebars.compile('' +
    '{{alert-message message=view.message title=view.messageLabel}}' +
    '{{yield}}' +
  ''),
  template : Ember.Handlebars.compile(''),
});
GlobalModules.GlobalModulesMap["modalBody"] = "modal/modalBody";

return {
  ModalBodyView : ModalBodyView,
};

});

define('modal/modal-item/modalFooterView',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Footer view for modal.
 *
 * @class Modal.ModalFooterView
 * @exends GlobalModules.DisplayTextView
 * @submodule modal-item
 * @module modal
 */
var ModalFooterView = GlobalModules.DisplayTextView.extend({
  disableAlias : false,

  modalView : null,

  layout : Ember.Handlebars.compile('' +
    '{{#if view.columnData.modal.showOk}}' +
      '<button type="button" class="btn btn-primary ok-btn" {{bind-attr disabled=view.disableAlias}} {{action "okClicked" target="view"}}>' +
        '{{view.columnData.modal.okLabel}}' +
      '</button>' +
    '{{/if}}' +
    '{{#if view.columnData.modal.showCancel}}' +
      '<button type="button" class="btn btn-default cancel-btn" data-dismiss="modal" {{action "cancelClicked" target="view"}}>' +
        '{{view.columnData.modal.cancelLabel}}' +
      '</button>' +
    '{{/if}}' +
    '{{yield}}' +
  ''),

  actions : {
    okClicked : function() {
      this.get("modalView").send("okClicked");
    },

    cancelClicked : function() {
      this.get("modalView").send("cancelClicked");
    },
  },
});
GlobalModules.GlobalModulesMap["modalFooter"] = "modal/modalFooter";

return {
  ModalFooterView : ModalFooterView,
};

});

define('modal/modal-item/modalFormBodyView',[
  "ember",
  "../../global-module/main",
  "./modalBodyView",
], function(Ember, GlobalModules, ModalBodyView) {

/**
 * Body view for modal with form.
 *
 * @class Modal.ModalFormBodyView
 * @exends Modal.ModalBodyView
 * @submodule modal-item
 * @module modal
 */
var ModalFormBodyView = ModalBodyView.ModalBodyView.extend({
  template : Ember.Handlebars.compile('' +
    '{{view "form/form" record=view.value columnDataGroup=view.columnData.childColGroup}}' +
  ''),
});
GlobalModules.GlobalModulesMap["modalFormBody"] = "modal/modalFormBody";

return {
  ModalFormBodyView : ModalFormBodyView,
};

});

define('modal/modal-item/modalTitleView',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Title view for modal.
 *
 * @class Modal.ModalTitleView
 * @exends GlobalModules.DisplayTextView
 * @submodule modal-item
 * @module modal
 */
var ModalTitleView = GlobalModules.DisplayTextView.extend({
  titleId : "",
  layout : Ember.Handlebars.compile('' +
    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
    '<h4 class="modal-title" {{bind-attr id="view.titleId"}}>{{yield}}</h4>' +
  ''),
});
GlobalModules.GlobalModulesMap["modalTitle"] = "modal/modalTitle";

return {
  ModalTitleView    : ModalTitleView,
};

});

/**
 * Modal items submodule.
 *
 * @submodule modal-item
 * @module modal
 */
define('modal/modal-item/main',[
  "./modalBodyView",
  "./modalFooterView",
  "./modalFormBodyView",
  "./modalTitleView",
], function() {
  var ModalItem = {};

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ModalItem[k] = arguments[i][k];
      }
    }
  }

  return ModalItem;
});

define('modal/modal-column-data/modalTitleColumnDataMixin',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Column Data mixin for modal title.
 *
 * @class Modal.ModalTitleColumnDataMixin
 * @extends GlobalModules.DisplayTextColumnDataMixin
 * @module modal
 * @submodule modal-column-data
 */
var ModalTitleColumnDataMixin = Ember.Mixin.create({
  classNames : ["modal-header"],
});
GlobalModules.GlobalModulesColumnDataMixinMap["modalTitle"] = ModalTitleColumnDataMixin;

return {
  ModalTitleColumnDataMixin : ModalTitleColumnDataMixin,
};

});

define('modal/modal-column-data/modalBodyColumnDataMixin',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Column Data mixin for modal body.
 *
 * @class Modal.ModalBodyColumnDataMixin
 * @extends GlobalModules.DisplayTextColumnDataMixin
 * @module modal
 * @submodule modal-column-data
 */
var ModalBodyColumnDataMixin = Ember.Mixin.create({
  classNames : ["modal-body"],
});
GlobalModules.GlobalModulesColumnDataMixinMap["modalBody"] = ModalBodyColumnDataMixin;
GlobalModules.GlobalModulesColumnDataMixinMap["modalFormBody"] = ModalBodyColumnDataMixin;

return {
  ModalBodyColumnDataMixin : ModalBodyColumnDataMixin,
};

});

define('modal/modal-column-data/modalFooterColumnDataMixin',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Column Data mixin for modal footer.
 *
 * @class Modal.ModalFooterColumnDataMixin
 * @extends GlobalModules.DisplayTextColumnDataMixin
 * @module modal
 * @submodule modal-column-data
 */
var ModalFooterColumnDataMixin = Ember.Mixin.create({
  classNames : ["modal-footer"],

  showOk : true,
  showCancel : true,
  okLabel : "Ok",
  cancelLabel : "Cancel",
});
GlobalModules.GlobalModulesColumnDataMixinMap["modalFooter"] = ModalFooterColumnDataMixin;

return {
  ModalFooterColumnDataMixin : ModalFooterColumnDataMixin,
};

});

define('modal/modal-column-data/modalColumnData',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Column data for the modal items (title, body, footer)
 *
 * @class Modal.ModalColumnData
 * @module modal
 * @submodule modal-column-data
 */
var ModalColumnData = Ember.Object.extend({
});

var ModalColumnDataMap = {
  title  : ModalColumnData,
  body   : ModalColumnData,
  footer : ModalColumnData,
};

return {
  ModalColumnData    : ModalColumnData,
  ModalColumnDataMap : ModalColumnDataMap,
};

});

define('modal/modal-column-data/modalColumnDataGroup',[
  "ember",
  "../../global-module/main",
], function(Ember, GlobalModules) {

/**
 * Column data group for modal module.
 *
 * @class Modal.ModalColumnDataGroup
 * @module modal
 * @submodule modal-column-data
 */
var ModalColumnDataGroup = Ember.Object.extend(GlobalModules.GlobalModuleColumnDataGroupMixin, {
  type : "modal",
  modules : ["title", "body", "footer"],
  lookupMap : {},

  /**
   * Type of title view.
   *
   * @property titleType
   * @type String
   * @default "modalTitle"
   */
  titleType : "modalTitle",

  /**
   * Type of body view.
   *
   * @property bodyType
   * @type String
   * @default "modalBody"
   */
  bodyType : "modalBody",

  /**
   * Type of footer view.
   *
   * @property footerType
   * @type String
   * @default "modalFooter"
   */
  footerType : "modalFooter",
});

return {
  ModalColumnDataGroup : ModalColumnDataGroup,
};

});

/**
 * Modal items submodule.
 *
 * @submodule modal-column-data
 * @module modal
 */
define('modal/modal-column-data/main',[
  "./modalTitleColumnDataMixin",
  "./modalBodyColumnDataMixin",
  "./modalFooterColumnDataMixin",
  "./modalColumnData",
  "./modalColumnDataGroup",
], function() {
  var ModalColumnData = {};

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        ModalColumnData[k] = arguments[i][k];
      }
    }
  }

  return ModalColumnData;
});

/**
 * A module for a modal windows.
 *
 * @module modal
 */
define('modal/main',[
  "./modalWindowView",
  "./formWindowView",
  "./modal-item/main",
  "./modal-column-data/main",
], function() {
  var Modal = Ember.Namespace.create();
  window.Modal = Modal;

  for(var i = 0; i < arguments.length; i++) {
    for(var k in arguments[i]) {
      if(arguments[i].hasOwnProperty(k)) {
        Modal[k] = arguments[i][k];
      }
    }
  }

  return Modal;
});

define('misc/alerts',[
  "ember",
], function(Ember) {

/**
 * Alert module for all stuff related to alerts.
 *
 * @module alerts
 */

Alerts = Ember.Namespace.create();
Alerts.AlertTypeMap = {
  info : {
    alertClass : 'alert-info',
    glyphiconClass : 'glyphicon-info-sign',
  },
  success : {
    alertClass : 'alert-success',
    glyphiconClass : 'glyphicon-ok-sign',
  },
  warning : {
    alertClass : 'alert-warning',
    glyphiconClass : 'glyphicon-warning-sign',
  },
  error : {
    alertClass : 'alert-danger',
    glyphiconClass : 'glyphicon-exclamation-sign',
  },
};

/**
 * View for alert message.
 * Usage : 
 *
 *     {{alert-message type="info" title="Title" message="Message"}}
 *
 * @class Alerts.AlertMessageComponent
 */
Alerts.AlertMessageComponent = Ember.Component.extend({
  init : function() {
    this._super();
    this.set("switchOnMessageListener", true);
  },

  /**
   * Type of alert message. Possible values are "success", "warning", "info", "error"
   *
   * @property type
   * @type String
   * @default "error"
   */
  type : 'error',

  /**
   * Title of the alert message.
   *
   * @property title
   * @type String
   */
  title : "",

  /**
   * Alert message.
   *
   * @property message
   * @type String
   */
  message : function(key, value) {
    if(arguments.length > 1) {
      if(!Ember.isEmpty(value) && this.get("switchOnMessageListener")) {
        var timeout = this.get("collapseTimeout"), that = this;
        this.set("showAlert", true);
        if(!Ember.isEmpty(timeout) && timeout > 0) {
          Timer.addToQue(this.get("elementId"), timeout).then(function() {
            that.set("showAlert", false);
          });
        }
      }
      else {
        this.set("showAlert", false);
      }
      return value;
    }
  }.property(),
  switchOnMessageListener : false,

  /**
   * Timeout after which to collapse the alert message. 0 to disable.
   *
   * @property collapseTimeout
   * @type Number
   * @default 0
   */
  collapseTimeout : 0,

  typeData : function() {
    var type = this.get("type");
    return Alerts.AlertTypeMap[type] || Alerts.AlertTypeMap.error;
  }.property('type'),

  showAlert : false,

  click : function(e) {
    if($(e.target).filter("button.close").length > 0) {
      var that = this;
      Ember.run(function() {
        that.set("showAlert", false);
      });
    }
  },

  classNameBindings : [":alert", "typeData.alertClass", ":fade", "showAlert:in"],

  layout : Ember.Handlebars.compile('' +
    '<button class="close">&times;</button>' +
    '<strong><span {{bind-attr class=":glyphicon typeData.glyphiconClass :btn-sm"}}></span>' +
    '<span class="alert-title">{{title}}</span></strong> <span class="alert-message">{{message}}</span>' +
    '{{yield}}' +
  ''),
});

Ember.Handlebars.helper("alert-message", Alerts.AlertMessageComponent);

return Alerts;

});

define('misc/app-wrapper',[
  "ember",
], function(Ember) {

/**
 * A module for wrapper over Ember.Application which initializes a few things automatically
 * 
 * @module app-wrapper
 */

AppWrapper = Ember.Namespace.create();

/**
 * A wrapper class over Ember.Application which initializes CrudAdapter and ColumnData.
 *
 * @class AppWrapper.AppWrapper
 */
AppWrapper.AppWrapper = Ember.Application.extend({
  init : function() {
    this._super();
    CrudAdapter.loadAdaptor(this);
  },

  ready : function() {
    this._super();
    ColumnData.initializer(this);
  },
});

return AppWrapper;

});

define('misc/popover',[
  "ember",
], function(Ember) {

/**
 * Module for popovers.
 *
 * @module popover
 */
Popovers = Ember.Namespace.create();

/**
 * Component for popover.
 * Usage:
 *
 *     {{#pop-over title="Title" body="Body of the popover"}}Some body{{/pop-over}}
 *
 * @class Popovers.PopoverComponent
 */
Popovers.PopoverComponent = Ember.Component.extend({
  attributeBindings : ['animation:data-animation', 'placement:data-placement', 'trigger:data-trigger', 'title:data-original-title', 'body:data-content', 'delay:data-delay', 'role'],

  /**
   * Property to enable animation. Can have "true"/"false".
   *
   * @property animation
   * @type String
   * @default "true"
   */
  animation : "true",

  /**
   * Placement of the popover. Can have "top"/"right"/"bottom"/"left".
   *
   * @property placement
   * @type String
   * @default "top"
   */
  placement : "top",

  /**
   * The trigger of the popover. Can have "click"/"hover"/"focus". Multiple triggers can be passed seperated with space.
   *
   * @property trigger
   * @type String
   * @default "click"
   */
  trigger : "click",

  /**
   * Title of the tooltip.
   *
   * @property title
   * @type String
   */
  title : "",

  /**
   * Body of the tooltip.
   *
   * @property body
   * @type String
   */
  body : "",

  /**
   * Delay to display tooltip.
   *
   * @property delay
   * @type Number
   * @default 0
   */
  delay : 0,

  role : "button",
  layout : Ember.Handlebars.compile('{{yield}}'),

  didInsertElement : function() {
    $(this.get("element")).popover();
  },
});

Ember.Handlebars.helper('pop-over', Popovers.PopoverComponent);

return Popovers;

});

define('misc/progress-bars',[
  "ember",
], function(Ember) {

/**
 * Progress bar module.
 *
 * @module progress-bar
 */
ProgressBars = Ember.Namespace.create();
ProgressBars.StyleMap = {
  "success" : {
    "class" : "progress-bar-success",
  },
  "info" : {
    "class" : "progress-bar-info",
  },
  "warning" : {
    "class" : "progress-bar-warning",
  },
  "error" : {
    "class" : "progress-bar-danger",
  },
};

/**
 * View for progress bars.
 * Used as:
 *
 *     {{#progress-bar maxVal=150 minVal=50 val=100 style="info" animated=true striped=true}}{{val}}/{{maxVal}}{{/progress-bar}}
 *
 * @class ProgressBars.ProgressBar
 */
ProgressBars.ProgressBar = Ember.Component.extend({
  classNames : ["progress"],

  /**
   * Max value for the progress.
   *
   * @property maxVal
   * @type Number
   * @default 100
   */
  maxVal : 100,

  /**
   * Min value for the progress.
   *
   * @property minVal
   * @type Number
   * @default 0
   */
  minVal : 0,

  /**
   * Cur value for the progress.
   *
   * @property val
   * @type Number
   * @default 0
   */
  val : 0,

  /**
   * Style of the progress bar. Can be default/success/info/error/warning.
   *
   * @property style
   * @type String
   * @default ""
   */
  style : "",
  styleClass : function() {
    var style = ProgressBars.StyleMap[this.get("style")];
    return style && style["class"];
  }.property("style"),

  /**
   * Property to enable striped progress bar.
   *
   * @property striped
   * @type Boolean
   * @default false
   */
  striped : false,

  /**
   * Property to enable animated progress bar.
   *
   * @property striped
   * @type Boolean
   * @default false
   */
  animated : false,

  progressStyle : function() {
    var maxVal = this.get("maxVal"), minVal = this.get("minVal"), val = this.get("val"),
        v = ( Number(val) - Number(minVal) ) * 100 / ( Number(maxVal) - Number(minVal) );
    return "width: "+v+"%;";
  }.property("val", "maxVal", "minVal"),

  layout : Ember.Handlebars.compile('' +
    '<div role="progressbar" {{bind-attr aria-valuenow=val aria-valuemin=minVal aria-valuemax=maxVal style=progressStyle ' +
                                        'class=":progress-bar styleClass striped:progress-bar-striped animated:active"}}>' +
      '<div class="progressbar-tag">{{yield}}</div>' +
    '</div>' +
  ''),
});

Ember.Handlebars.helper('progress-bar', ProgressBars.ProgressBar);

return ProgressBars;

});

define('misc/tooltips',[
  "ember",
], function(Ember) {

/**
 * Module for the tooltip component.
 *
 * @module tooltip
 */

Tooltip = Ember.Namespace.create();

/**
 * Component for the tooltip.
 * Usage:
 *
 *     {{#tool-tip title="Tooltip"}}Heading{{/tool-tip}}
 */
Tooltip.TooltipComponent = Ember.Component.extend({
  attributeBindings : ['animation:data-animation', 'placement:data-placement', 'title', 'delay:data-delay', 'type'],

  /**
   * Property to enable animation. Can be "true"/"false"
   *
   * @property animation
   * @type String
   * @default "true"
   */
  animation : "true",

  /**
   * Placement of the tooltip. Can be "top"/"right"/"bottom"/"left".
   *
   * @property placement
   * @type String
   * @default "top"
   */
  placement : "top",

  /**
   * Title of the tooltip.
   *
   * @property title
   * @type String
   */
  title : "",

  /**
   * Delay to display tooltip.
   *
   * @property delay
   * @type Number
   * @default 0
   */
  delay : 0,

  type : "button",
  layout : Ember.Handlebars.compile('{{yield}}'),
  tagName : "span",

  didInsertElement : function() {
    $(this.get("element")).tooltip();
  },
});

Ember.Handlebars.helper('tool-tip', Tooltip.TooltipComponent);

return Tooltip;

});

define('misc/main',[
  "./alerts",
  "./app-wrapper",
  "./popover",
  "./progress-bars",
  "./tooltips",
], function() {
});

define('ember-utils',[
  "ember",
  "bootstrap",
  "./column-data/main",
  "./timer/main",
  "./array-modifier/main",
  "./crud-adapter/main",
  "./drag-drop/main",
  "./global-module/main",
  "./list-group/main",
  "./tree/main",
  "./panels/main",
  "./lazy-display/main",
  "./form/main",
  "./modal/main",
  "./misc/main",
], function() {
});

  // Register in the values from the outer closure for common dependencies
  // as local almond modules
  define('jquery', function() {
    return $;
  });
  define('ember', function() {
    return Ember;
  });
  define('ember_data', function() {
    return DS;
  });

  // Use almond's special top level synchronous require to trigger factory
  // functions, get the final module, and export it as the public api.
  return require('ember-utils');
}));
