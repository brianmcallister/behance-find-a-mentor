/**
 * @license r.js 2.1.2 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*
 * This is a bootstrap script to allow running RequireJS in the command line
 * in either a Java/Rhino or Node environment. It is modified by the top-level
 * dist.js file to inject other files to completely enable this file. It is
 * the shell of the r.js file.
 */

/*jslint evil: true, nomen: true, sloppy: true */
/*global readFile: true, process: false, Packages: false, print: false,
console: false, java: false, module: false, requirejsVars, navigator,
document, importScripts, self, location */

var requirejs, require, define;
(function (console, args, readFileFunc) {

    var fileName, env, fs, vm, path, exec, rhinoContext, dir, nodeRequire,
        nodeDefine, exists, reqMain, loadedOptimizedLib, existsForNode,
        version = '2.1.2',
        jsSuffixRegExp = /\.js$/,
        commandOption = '',
        useLibLoaded = {},
        //Used by jslib/rhino/args.js
        rhinoArgs = args,
        readFile = typeof readFileFunc !== 'undefined' ? readFileFunc : null;

    function showHelp() {
        console.log('See https://github.com/jrburke/r.js for usage.');
    }

    if ((typeof navigator !== 'undefined' && typeof document !== 'undefined') ||
            (typeof importScripts !== 'undefined' && typeof self !== 'undefined')) {
        env = 'browser';

        readFile = function (path) {
            return fs.readFileSync(path, 'utf8');
        };

        exec = function (string, name) {
            return eval(string);
        };

        exists = function (fileName) {
            console.log('x.js exists not applicable in browser env');
            return false;
        };

    } else if (typeof Packages !== 'undefined') {
        env = 'rhino';

        fileName = args[0];

        if (fileName && fileName.indexOf('-') === 0) {
            commandOption = fileName.substring(1);
            fileName = args[1];
        }

        //Set up execution context.
        rhinoContext = Packages.org.mozilla.javascript.ContextFactory.getGlobal().enterContext();

        exec = function (string, name) {
            return rhinoContext.evaluateString(this, string, name, 0, null);
        };

        exists = function (fileName) {
            return (new java.io.File(fileName)).exists();
        };

        //Define a console.log for easier logging. Don't
        //get fancy though.
        if (typeof console === 'undefined') {
            console = {
                log: function () {
                    print.apply(undefined, arguments);
                }
            };
        }
    } else if (typeof process !== 'undefined') {
        env = 'node';

        //Get the fs module via Node's require before it
        //gets replaced. Used in require/node.js
        fs = require('fs');
        vm = require('vm');
        path = require('path');
        //In Node 0.7+ existsSync is on fs.
        existsForNode = fs.existsSync || path.existsSync;

        nodeRequire = require;
        nodeDefine = define;
        reqMain = require.main;

        //Temporarily hide require and define to allow require.js to define
        //them.
        require = undefined;
        define = undefined;

        readFile = function (path) {
            return fs.readFileSync(path, 'utf8');
        };

        exec = function (string, name) {
            return vm.runInThisContext(this.requirejsVars.require.makeNodeWrapper(string),
                                       name ? fs.realpathSync(name) : '');
        };

        exists = function (fileName) {
            return existsForNode(fileName);
        };


        fileName = process.argv[2];

        if (fileName && fileName.indexOf('-') === 0) {
            commandOption = fileName.substring(1);
            fileName = process.argv[3];
        }
    }

    /** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.2 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, jQuery, setTimeout, opera */


(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.2',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        aps = ap.slice,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && navigator && document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value !== 'string') {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    //Allow getting a global that expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                pkgs: {},
                shim: {},
                map: {},
                config: {}
            },
            registry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; ary[i]; i += 1) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgName, pkgConfig, mapValue, nameParts, i, j, nameSegment,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    if (getOwn(config.pkgs, baseName)) {
                        //If the baseName is a package name, then just treat it as one
                        //name to concat the name with.
                        normalizedBaseParts = baseParts = [baseName];
                    } else {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that 'directory' and not name of the baseName's
                        //module. For instance, baseName of 'one/two/three', maps to
                        //'one/two/three.js', but we want the directory, 'one/two' for
                        //this normalization.
                        normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    }

                    name = normalizedBaseParts.concat(name.split('/'));
                    trimDots(name);

                    //Some use of packages may use a . path to reference the
                    //'main' module name, so normalize for that.
                    pkgConfig = getOwn(config.pkgs, (pkgName = name[0]));
                    name = name.join('/');
                    if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
                        name = pkgName;
                    }
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && (baseParts || starMap) && map) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
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
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
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

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                removeScript(id);
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
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
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                getModule(depMap).on(name, fn);
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length - 1, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return mod.exports;
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return (config.config && getOwn(config.config, mod.map.id)) || {};
                        },
                        exports: defined[mod.map.id]
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var map, modId, err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(registry, function (mod) {
                map = mod.map;
                modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks is the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error.
                            if (this.events.error) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            if (this.map.isDefine) {
                                //If setting exports via 'module' is in play,
                                //favor that over return value and exports. After that,
                                //favor a non-undefined return value over exports use.
                                cjsModule = this.module;
                                if (cjsModule &&
                                        cjsModule.exports !== undefined &&
                                        //Make sure it is not already the exports value
                                        cjsModule.exports !== this.exports) {
                                    exports = cjsModule.exports;
                                } else if (exports === undefined && this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = [this.map.id];
                                err.requireType = 'define';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        delete registry[id];

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true,
                            skipMap: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            throw new Error('fromText eval for ' + moduleName +
                                            ' failed: ' + e);
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', this.errback);
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths and packages since they require special processing,
                //they are additive.
                var pkgs = config.pkgs,
                    shim = config.shim,
                    objs = {
                        paths: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (prop === 'map') {
                            mixin(config[prop], value, true, true);
                        } else {
                            mixin(config[prop], value, true);
                        }
                    } else {
                        config[prop] = value;
                    }
                });

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;
                        location = pkgObj.location;

                        //Create a brand new object on pkgs, since currentPackages can
                        //be passed in again, and config.pkgs is the internal transformed
                        //state for all package configs.
                        pkgs[pkgObj.name] = {
                            name: pkgObj.name,
                            location: location || pkgObj.name,
                            //Remove leading dot in main, so main paths are normalized,
                            //and remove any trailing .js, since different package
                            //envs have different conventions: some use a module name,
                            //some use a file name.
                            main: (pkgObj.main || 'main')
                                  .replace(currDirRegExp, '')
                                  .replace(jsSuffixRegExp, '')
                        };
                    });

                    //Done with modifications, assing packages back to context config
                    config.pkgs = pkgs;
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var index = moduleNamePlusExt.lastIndexOf('.'),
                            ext = null;

                        if (index !== -1) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. parent module is passed in for context,
             * used by the optimizer.
             */
            enable: function (depMap, parent) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext) {
                var paths, pkgs, pkg, pkgPath, syms, i, parentModule, url,
                    parentPath;

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;
                    pkgs = config.pkgs;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        pkg = getOwn(pkgs, parentModule);
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        } else if (pkg) {
                            //If module name is just the package name, then looking
                            //for the main module.
                            if (moduleName === pkg.name) {
                                pkgPath = pkg.location + '/' + pkg.main;
                            } else {
                                pkgPath = pkg.location;
                            }
                            syms.splice(0, i, pkgPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/\?/.test(url) ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callack function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error', evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = function (err) {
        throw err;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = config.xhtml ?
                    document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                    document.createElement('script');
            node.type = config.scriptType || 'text/javascript';
            node.charset = 'utf-8';
            node.async = true;

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEvenListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            //In a web worker, use importScripts. This is not a very
            //efficient use of importScripts, importScripts will block until
            //its script is downloaded and evaluated. However, if web workers
            //are in play, the expectation that a build has been done so that
            //only one script needs to be loaded anyway. This may need to be
            //reevaluated if other use cases become common.
            importScripts(url);

            //Account for anonymous modules
            context.completeLoad(moduleName);
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = dataMain.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                    dataMain = mainScript;
                }

                //Strip off any trailing .js since dataMain is now
                //like a module name.
                dataMain = dataMain.replace(jsSuffixRegExp, '');

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(dataMain) : [dataMain];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = [];
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps.length && isFunction(callback)) {
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));


    if (env === 'browser') {
        /**
 * @license RequireJS rhino Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

//sloppy since eval enclosed with use strict causes problems if the source
//text is not strict-compliant.
/*jslint sloppy: true, evil: true */
/*global require, XMLHttpRequest */

(function () {
    require.load = function (context, moduleName, url) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.send();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                eval(xhr.responseText);

                //Support anonymous modules.
                context.completeLoad(moduleName);
            }
        };
    };
}());
    } else if (env === 'rhino') {
        /**
 * @license RequireJS rhino Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint */
/*global require: false, java: false, load: false */

(function () {
    'use strict';
    require.load = function (context, moduleName, url) {

        load(url);

        //Support anonymous modules.
        context.completeLoad(moduleName);
    };

}());
    } else if (env === 'node') {
        this.requirejsVars = {
            require: require,
            requirejs: require,
            define: define,
            nodeRequire: nodeRequire
        };
        require.nodeRequire = nodeRequire;

        /**
 * @license RequireJS node Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint regexp: false */
/*global require: false, define: false, requirejsVars: false, process: false */

/**
 * This adapter assumes that x.js has loaded it and set up
 * some variables. This adapter just allows limited RequireJS
 * usage from within the requirejs directory. The general
 * node adapater is r.js.
 */

(function () {
    'use strict';

    var nodeReq = requirejsVars.nodeRequire,
        req = requirejsVars.require,
        def = requirejsVars.define,
        fs = nodeReq('fs'),
        path = nodeReq('path'),
        vm = nodeReq('vm'),
        //In Node 0.7+ existsSync is on fs.
        exists = fs.existsSync || path.existsSync,
        hasOwn = Object.prototype.hasOwnProperty;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function syncTick(fn) {
        fn();
    }

    //Supply an implementation that allows synchronous get of a module.
    req.get = function (context, moduleName, relModuleMap) {
        if (moduleName === "require" || moduleName === "exports" || moduleName === "module") {
            req.onError(new Error("Explicit require of " + moduleName + " is not allowed."));
        }

        var ret, oldTick,
            moduleMap = context.makeModuleMap(moduleName, relModuleMap);

        //Normalize module name, if it contains . or ..
        moduleName = moduleMap.id;

        if (hasProp(context.defined, moduleName)) {
            ret = context.defined[moduleName];
        } else {
            if (ret === undefined) {
                //Make sure nextTick for this type of call is sync-based.
                oldTick = context.nextTick;
                context.nextTick = syncTick;
                try {
                    if (moduleMap.prefix) {
                        //A plugin, call requirejs to handle it. Now that
                        //nextTick is syncTick, the require will complete
                        //synchronously.
                        context.require([moduleMap.originalName]);

                        //Now that plugin is loaded, can regenerate the moduleMap
                        //to get the final, normalized ID.
                        moduleMap = context.makeModuleMap(moduleMap.originalName, relModuleMap);

                        //The above calls are sync, so can do the next thing safely.
                        ret = context.defined[moduleMap.id];
                    } else {
                        //Try to dynamically fetch it.
                        req.load(context, moduleName, moduleMap.url);

                        //Enable the module
                        context.enable(moduleMap, relModuleMap);

                        //The above calls are sync, so can do the next thing safely.
                        ret = context.defined[moduleName];
                    }
                } finally {
                    context.nextTick = oldTick;
                }
            }
        }

        return ret;
    };

    req.nextTick = function (fn) {
        process.nextTick(fn);
    };

    //Add wrapper around the code so that it gets the requirejs
    //API instead of the Node API, and it is done lexically so
    //that it survives later execution.
    req.makeNodeWrapper = function (contents) {
        return '(function (require, requirejs, define) { ' +
                contents +
                '\n}(requirejsVars.require, requirejsVars.requirejs, requirejsVars.define));';
    };

    req.load = function (context, moduleName, url) {
        var contents, err;

        if (exists(url)) {
            contents = fs.readFileSync(url, 'utf8');

            contents = req.makeNodeWrapper(contents);
            try {
                vm.runInThisContext(contents, fs.realpathSync(url));
            } catch (e) {
                err = new Error('Evaluating ' + url + ' as module "' +
                                moduleName + '" failed with error: ' + e);
                err.originalError = e;
                err.moduleName = moduleName;
                err.fileName = url;
                return req.onError(err);
            }
        } else {
            def(moduleName, function () {
                //Get the original name, since relative requires may be
                //resolved differently in node (issue #202)
                var originalName = hasProp(context.registry, moduleName) &&
                            context.registry[moduleName].map.originalName;

                try {
                    return (context.config.nodeRequire || req.nodeRequire)(originalName);
                } catch (e) {
                    err = new Error('Calling node\'s require("' +
                                        originalName + '") failed with error: ' + e);
                    err.originalError = e;
                    err.moduleName = originalName;
                    return req.onError(err);
                }
            });
        }

        //Support anonymous modules.
        context.completeLoad(moduleName);
    };

    //Override to provide the function wrapper for define/require.
    req.exec = function (text) {
        /*jslint evil: true */
        text = req.makeNodeWrapper(text);
        return eval(text);
    };
}());

    }

    //Support a default file name to execute. Useful for hosted envs
    //like Joyent where it defaults to a server.js as the only executed
    //script. But only do it if this is not an optimization run.
    if (commandOption !== 'o' && (!fileName || !jsSuffixRegExp.test(fileName))) {
        fileName = 'main.js';
    }

    /**
     * Loads the library files that can be used for the optimizer, or for other
     * tasks.
     */
    function loadLib() {
        /**
 * @license Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global Packages: false, process: false, window: false, navigator: false,
  document: false, define: false */

/**
 * A plugin that modifies any /env/ path to be the right path based on
 * the host environment. Right now only works for Node, Rhino and browser.
 */
(function () {
    var pathRegExp = /(\/|^)env\/|\{env\}/,
        env = 'unknown';

    if (typeof Packages !== 'undefined') {
        env = 'rhino';
    } else if (typeof process !== 'undefined') {
        env = 'node';
    } else if ((typeof navigator !== 'undefined' && typeof document !== 'undefined') ||
            (typeof importScripts !== 'undefined' && typeof self !== 'undefined')) {
        env = 'browser';
    }

    define('env', {
        load: function (name, req, load, config) {
            //Allow override in the config.
            if (config.env) {
                env = config.env;
            }

            name = name.replace(pathRegExp, function (match, prefix) {
                if (match.indexOf('{') === -1) {
                    return prefix + env + '/';
                } else {
                    return env;
                }
            });

            req([name], function (mod) {
                load(mod);
            });
        }
    });
}());/**
 * @license Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint plusplus: true */
/*global define */

define('lang', function () {
    'use strict';

    var lang,
        hasOwn = Object.prototype.hasOwnProperty;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    lang = {
        backSlashRegExp: /\\/g,
        ostring: Object.prototype.toString,

        isArray: Array.isArray || function (it) {
            return lang.ostring.call(it) === "[object Array]";
        },

        isFunction: function(it) {
            return lang.ostring.call(it) === "[object Function]";
        },

        isRegExp: function(it) {
            return it && it instanceof RegExp;
        },

        hasProp: hasProp,

        //returns true if the object does not have an own property prop,
        //or if it does, it is a falsy value.
        falseProp: function (obj, prop) {
            return !hasProp(obj, prop) || !obj[prop];
        },

        //gets own property value for given prop on object
        getOwn: function (obj, prop) {
            return hasProp(obj, prop) && obj[prop];
        },

        _mixin: function(dest, source, override){
            var name;
            for (name in source) {
                if(source.hasOwnProperty(name)
                    && (override || !dest.hasOwnProperty(name))) {
                    dest[name] = source[name];
                }
            }

            return dest; // Object
        },

        /**
         * mixin({}, obj1, obj2) is allowed. If the last argument is a boolean,
         * then the source objects properties are force copied over to dest.
         */
        mixin: function(dest){
            var parameters = Array.prototype.slice.call(arguments),
                override, i, l;

            if (!dest) { dest = {}; }

            if (parameters.length > 2 && typeof arguments[parameters.length-1] === 'boolean') {
                override = parameters.pop();
            }

            for (i = 1, l = parameters.length; i < l; i++) {
                lang._mixin(dest, parameters[i], override);
            }
            return dest; // Object
        },

        delegate: (function () {
            // boodman/crockford delegation w/ cornford optimization
            function TMP() {}
            return function (obj, props) {
                TMP.prototype = obj;
                var tmp = new TMP();
                TMP.prototype = null;
                if (props) {
                    lang.mixin(tmp, props);
                }
                return tmp; // Object
            };
        }()),

        /**
         * Helper function for iterating over an array. If the func returns
         * a true value, it will break out of the loop.
         */
        each: function each(ary, func) {
            if (ary) {
                var i;
                for (i = 0; i < ary.length; i += 1) {
                    if (func(ary[i], i, ary)) {
                        break;
                    }
                }
            }
        },

        /**
         * Cycles over properties in an object and calls a function for each
         * property value. If the function returns a truthy value, then the
         * iteration is stopped.
         */
        eachProp: function eachProp(obj, func) {
            var prop;
            for (prop in obj) {
                if (hasProp(obj, prop)) {
                    if (func(obj[prop], prop)) {
                        break;
                    }
                }
            }
        },

        //Similar to Function.prototype.bind, but the "this" object is specified
        //first, since it is easier to read/figure out what "this" will be.
        bind: function bind(obj, fn) {
            return function () {
                return fn.apply(obj, arguments);
            };
        },

        //Escapes a content string to be be a string that has characters escaped
        //for inclusion as part of a JS string.
        jsEscape: function (content) {
            return content.replace(/(["'\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r");
        }
    };
    return lang;
});

/**
 * prim 0.0.0 Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/prim for details
 */

/*global process, setTimeout, define, module */

//Set prime.hideResolutionConflict = true to allow "resolution-races"
//in promise-tests to pass.
//Since the goal of prim is to be a small impl for trusted code, it is
//more important to normally throw in this case so that we can find
//logic errors quicker.

var prim;
(function () {
    'use strict';
    var op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i]) {
                    func(ary[i], i, ary);
                }
            }
        }
    }

    function check(p) {
        if (hasProp(p, 'e') || hasProp(p, 'v')) {
            if (!prim.hideResolutionConflict) {
                throw new Error('nope');
            }
            return false;
        }
        return true;
    }

    function notify(ary, value) {
        prim.nextTick(function () {
            each(ary, function (item) {
                item(value);
            });
        });
    }

    prim = function prim() {
        var p,
            ok = [],
            fail = [];

        return (p = {
            callback: function (yes, no) {
                if (no) {
                    p.errback(no);
                }

                if (hasProp(p, 'v')) {
                    prim.nextTick(function () {
                        yes(p.v);
                    });
                } else {
                    ok.push(yes);
                }
            },

            errback: function (no) {
                if (hasProp(p, 'e')) {
                    prim.nextTick(function () {
                        no(p.e);
                    });
                } else {
                    fail.push(no);
                }
            },

            resolve: function (v) {
                if (check(p)) {
                    p.v = v;
                    notify(ok, v);
                }
                return p;
            },
            reject: function (e) {
                if (check(p)) {
                    p.e = e;
                    notify(fail, e);
                }
                return p;
            },

            start: function (fn) {
                p.resolve();
                return p.promise.then(fn);
            },

            promise: {
                then: function (yes, no) {
                    var next = prim();

                    p.callback(function (v) {
                        try {
                            v = yes ? yes(v) : v;

                            if (v && v.then) {
                                v.then(next.resolve, next.reject);
                            } else {
                                next.resolve(v);
                            }
                        } catch (e) {
                            next.reject(e);
                        }
                    }, function (e) {
                        var err;

                        try {
                            if (!no) {
                                next.reject(e);
                            } else {
                                err = no(e);

                                if (err instanceof Error) {
                                    next.reject(err);
                                } else {
                                    if (err && err.then) {
                                        err.then(next.resolve, next.reject);
                                    } else {
                                        next.resolve(err);
                                    }
                                }
                            }
                        } catch (e2) {
                            next.reject(e2);
                        }
                    });

                    return next.promise;
                },

                fail: function (no) {
                    return p.promise.then(null, no);
                },

                end: function () {
                    p.errback(function (e) {
                        throw e;
                    });
                }
            }
        });
    };

    prim.serial = function (ary) {
        var result = prim().resolve().promise;
        each(ary, function (item) {
            result = result.then(function () {
                return item();
            });
        });
        return result;
    };

    prim.nextTick = typeof process !== 'undefined' && process.nextTick ?
            process.nextTick : (typeof setTimeout !== 'undefined' ?
                function (fn) {
                setTimeout(fn, 0);
            } : function (fn) {
        fn();
    });

    if (typeof define === 'function' && define.amd) {
        define('prim', function () { return prim; });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = prim;
    }
}());

if(env === 'browser') {
/**
 * @license RequireJS Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, load: false */

//Just a stub for use with uglify's consolidator.js
define('browser/assert', function () {
    return {};
});

}

if(env === 'node') {
/**
 * @license RequireJS Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, load: false */

//Needed so that rhino/assert can return a stub for uglify's consolidator.js
define('node/assert', ['assert'], function (assert) {
    return assert;
});

}

if(env === 'rhino') {
/**
 * @license RequireJS Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, load: false */

//Just a stub for use with uglify's consolidator.js
define('rhino/assert', function () {
    return {};
});

}

if(env === 'browser') {
/**
 * @license Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, process: false */

define('browser/args', function () {
    //Always expect config via an API call
    return [];
});

}

if(env === 'node') {
/**
 * @license Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, process: false */

define('node/args', function () {
    //Do not return the "node" or "r.js" arguments
    var args = process.argv.slice(2);

    //Ignore any command option used for rq.js
    if (args[0] && args[0].indexOf('-' === 0)) {
        args = args.slice(1);
    }

    return args;
});

}

if(env === 'rhino') {
/**
 * @license Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, process: false */

var jsLibRhinoArgs = (typeof rhinoArgs !== 'undefined' && rhinoArgs) || [].concat(Array.prototype.slice.call(arguments, 0));

define('rhino/args', function () {
    var args = jsLibRhinoArgs;

    //Ignore any command option used for rq.js
    if (args[0] && args[0].indexOf('-' === 0)) {
        args = args.slice(1);
    }

    return args;
});

}

if(env === 'browser') {
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, console: false */

define('browser/load', ['./file'], function (file) {
    function load(fileName) {
        eval(file.readFile(fileName));
    }

    return load;
});

}

if(env === 'node') {
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, console: false */

define('node/load', ['fs'], function (fs) {
    function load(fileName) {
        var contents = fs.readFileSync(fileName, 'utf8');
        process.compile(contents, fileName);
    }

    return load;
});

}

if(env === 'rhino') {
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, load: false */

define('rhino/load', function () {
    return load;
});

}

if(env === 'browser') {
/**
 * @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint sloppy: true, nomen: true */
/*global require, define, console, XMLHttpRequest, requirejs */

define('browser/file', ['prim'], function (prim) {

    var file;

    function frontSlash(path) {
        return path.replace(/\\/g, '/');
    }

    function exists(path) {
        var status, xhr = new XMLHttpRequest();

        //Oh yeah, that is right SYNC IO. Behold its glory
        //and horrible blocking behavior.
        xhr.open('HEAD', path, false);
        xhr.send();
        status = xhr.status;

        return status === 200 || status === 304;
    }

    function mkDir(dir) {
        console.log('mkDir is no-op in browser');
    }

    function mkFullDir(dir) {
        console.log('mkFullDir is no-op in browser');
    }

    file = {
        backSlashRegExp: /\\/g,
        exclusionRegExp: /^\./,
        getLineSeparator: function () {
            return '/';
        },

        exists: function (fileName) {
            return exists(fileName);
        },

        parent: function (fileName) {
            var parts = fileName.split('/');
            parts.pop();
            return parts.join('/');
        },

        /**
         * Gets the absolute file path as a string, normalized
         * to using front slashes for path separators.
         * @param {String} fileName
         */
        absPath: function (fileName) {
            return fileName;
        },

        normalize: function (fileName) {
            return fileName;
        },

        isFile: function (path) {
            return true;
        },

        isDirectory: function (path) {
            return false;
        },

        getFilteredFileList: function (startDir, regExpFilters, makeUnixPaths) {
            console.log('file.getFilteredFileList is no-op in browser');
        },

        copyDir: function (srcDir, destDir, regExpFilter, onlyCopyNew) {
            console.log('file.copyDir is no-op in browser');

        },

        copyFile: function (srcFileName, destFileName, onlyCopyNew) {
            console.log('file.copyFile is no-op in browser');
        },

        /**
         * Renames a file. May fail if "to" already exists or is on another drive.
         */
        renameFile: function (from, to) {
            console.log('file.renameFile is no-op in browser');
        },

        /**
         * Reads a *text* file.
         */
        readFile: function (path, encoding) {
            var xhr = new XMLHttpRequest();

            //Oh yeah, that is right SYNC IO. Behold its glory
            //and horrible blocking behavior.
            xhr.open('GET', path, false);
            xhr.send();

            return xhr.responseText;
        },

        readFileAsync: function (path, encoding) {
            var xhr = new XMLHttpRequest(),
                d = prim();

            xhr.open('GET', path, true);
            xhr.send();

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status > 400) {
                        d.reject(new Error('Status: ' + xhr.status + ': ' + xhr.statusText));
                    } else {
                        d.resolve(xhr.responseText);
                    }
                }
            };

            return d.promise;
        },

        saveUtf8File: function (fileName, fileContents) {
            //summary: saves a *text* file using UTF-8 encoding.
            file.saveFile(fileName, fileContents, "utf8");
        },

        saveFile: function (fileName, fileContents, encoding) {
            requirejs.browser.saveFile(fileName, fileContents, encoding);
        },

        deleteFile: function (fileName) {
            console.log('file.deleteFile is no-op in browser');
        },

        /**
         * Deletes any empty directories under the given directory.
         */
        deleteEmptyDirs: function (startDir) {
            console.log('file.deleteEmptyDirs is no-op in browser');
        }
    };

    return file;

});

}

if(env === 'node') {
/**
 * @license Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint plusplus: false, octal:false, strict: false */
/*global define: false, process: false */

define('node/file', ['fs', 'path', 'prim'], function (fs, path, prim) {

    var isWindows = process.platform === 'win32',
        windowsDriveRegExp = /^[a-zA-Z]\:\/$/,
        file;

    function frontSlash(path) {
        return path.replace(/\\/g, '/');
    }

    function exists(path) {
        if (isWindows && path.charAt(path.length - 1) === '/' &&
            path.charAt(path.length - 2) !== ':') {
            path = path.substring(0, path.length - 1);
        }

        try {
            fs.statSync(path);
            return true;
        } catch (e) {
            return false;
        }
    }

    function mkDir(dir) {
        if (!exists(dir) && (!isWindows || !windowsDriveRegExp.test(dir))) {
            fs.mkdirSync(dir, 511);
        }
    }

    function mkFullDir(dir) {
        var parts = dir.split('/'),
            currDir = '',
            first = true;

        parts.forEach(function (part) {
            //First part may be empty string if path starts with a slash.
            currDir += part + '/';
            first = false;

            if (part) {
                mkDir(currDir);
            }
        });
    }

    file = {
        backSlashRegExp: /\\/g,
        exclusionRegExp: /^\./,
        getLineSeparator: function () {
            return '/';
        },

        exists: function (fileName) {
            return exists(fileName);
        },

        parent: function (fileName) {
            var parts = fileName.split('/');
            parts.pop();
            return parts.join('/');
        },

        /**
         * Gets the absolute file path as a string, normalized
         * to using front slashes for path separators.
         * @param {String} fileName
         */
        absPath: function (fileName) {
            return frontSlash(path.normalize(frontSlash(fs.realpathSync(fileName))));
        },

        normalize: function (fileName) {
            return frontSlash(path.normalize(fileName));
        },

        isFile: function (path) {
            return fs.statSync(path).isFile();
        },

        isDirectory: function (path) {
            return fs.statSync(path).isDirectory();
        },

        getFilteredFileList: function (/*String*/startDir, /*RegExp*/regExpFilters, /*boolean?*/makeUnixPaths) {
            //summary: Recurses startDir and finds matches to the files that match regExpFilters.include
            //and do not match regExpFilters.exclude. Or just one regexp can be passed in for regExpFilters,
            //and it will be treated as the "include" case.
            //Ignores files/directories that start with a period (.) unless exclusionRegExp
            //is set to another value.
            var files = [], topDir, regExpInclude, regExpExclude, dirFileArray,
                i, stat, filePath, ok, dirFiles, fileName;

            topDir = startDir;

            regExpInclude = regExpFilters.include || regExpFilters;
            regExpExclude = regExpFilters.exclude || null;

            if (file.exists(topDir)) {
                dirFileArray = fs.readdirSync(topDir);
                for (i = 0; i < dirFileArray.length; i++) {
                    fileName = dirFileArray[i];
                    filePath = path.join(topDir, fileName);
                    stat = fs.statSync(filePath);
                    if (stat.isFile()) {
                        if (makeUnixPaths) {
                            //Make sure we have a JS string.
                            if (filePath.indexOf("/") === -1) {
                                filePath = frontSlash(filePath);
                            }
                        }

                        ok = true;
                        if (regExpInclude) {
                            ok = filePath.match(regExpInclude);
                        }
                        if (ok && regExpExclude) {
                            ok = !filePath.match(regExpExclude);
                        }

                        if (ok && (!file.exclusionRegExp ||
                            !file.exclusionRegExp.test(fileName))) {
                            files.push(filePath);
                        }
                    } else if (stat.isDirectory() &&
                              (!file.exclusionRegExp || !file.exclusionRegExp.test(fileName))) {
                        dirFiles = this.getFilteredFileList(filePath, regExpFilters, makeUnixPaths);
                        files.push.apply(files, dirFiles);
                    }
                }
            }

            return files; //Array
        },

        copyDir: function (/*String*/srcDir, /*String*/destDir, /*RegExp?*/regExpFilter, /*boolean?*/onlyCopyNew) {
            //summary: copies files from srcDir to destDir using the regExpFilter to determine if the
            //file should be copied. Returns a list file name strings of the destinations that were copied.
            regExpFilter = regExpFilter || /\w/;

            //Normalize th directory names, but keep front slashes.
            //path module on windows now returns backslashed paths.
            srcDir = frontSlash(path.normalize(srcDir));
            destDir = frontSlash(path.normalize(destDir));

            var fileNames = file.getFilteredFileList(srcDir, regExpFilter, true),
            copiedFiles = [], i, srcFileName, destFileName;

            for (i = 0; i < fileNames.length; i++) {
                srcFileName = fileNames[i];
                destFileName = srcFileName.replace(srcDir, destDir);

                if (file.copyFile(srcFileName, destFileName, onlyCopyNew)) {
                    copiedFiles.push(destFileName);
                }
            }

            return copiedFiles.length ? copiedFiles : null; //Array or null
        },

        copyFile: function (/*String*/srcFileName, /*String*/destFileName, /*boolean?*/onlyCopyNew) {
            //summary: copies srcFileName to destFileName. If onlyCopyNew is set, it only copies the file if
            //srcFileName is newer than destFileName. Returns a boolean indicating if the copy occurred.
            var parentDir;

            //logger.trace("Src filename: " + srcFileName);
            //logger.trace("Dest filename: " + destFileName);

            //If onlyCopyNew is true, then compare dates and only copy if the src is newer
            //than dest.
            if (onlyCopyNew) {
                if (file.exists(destFileName) && fs.statSync(destFileName).mtime.getTime() >= fs.statSync(srcFileName).mtime.getTime()) {
                    return false; //Boolean
                }
            }

            //Make sure destination dir exists.
            parentDir = path.dirname(destFileName);
            if (!file.exists(parentDir)) {
                mkFullDir(parentDir);
            }

            fs.writeFileSync(destFileName, fs.readFileSync(srcFileName, 'binary'), 'binary');

            return true; //Boolean
        },

        /**
         * Renames a file. May fail if "to" already exists or is on another drive.
         */
        renameFile: function (from, to) {
            return fs.renameSync(from, to);
        },

        /**
         * Reads a *text* file.
         */
        readFile: function (/*String*/path, /*String?*/encoding) {
            if (encoding === 'utf-8') {
                encoding = 'utf8';
            }
            if (!encoding) {
                encoding = 'utf8';
            }

            var text = fs.readFileSync(path, encoding);

            //Hmm, would not expect to get A BOM, but it seems to happen,
            //remove it just in case.
            if (text.indexOf('\uFEFF') === 0) {
                text = text.substring(1, text.length);
            }

            return text;
        },

        readFileAsync: function (path, encoding) {
            var d = prim();
            try {
                d.resolve(file.readFile(path, encoding));
            } catch (e) {
                d.reject(e);
            }
            return d.promise;
        },

        saveUtf8File: function (/*String*/fileName, /*String*/fileContents) {
            //summary: saves a *text* file using UTF-8 encoding.
            file.saveFile(fileName, fileContents, "utf8");
        },

        saveFile: function (/*String*/fileName, /*String*/fileContents, /*String?*/encoding) {
            //summary: saves a *text* file.
            var parentDir;

            if (encoding === 'utf-8') {
                encoding = 'utf8';
            }
            if (!encoding) {
                encoding = 'utf8';
            }

            //Make sure destination directories exist.
            parentDir = path.dirname(fileName);
            if (!file.exists(parentDir)) {
                mkFullDir(parentDir);
            }

            fs.writeFileSync(fileName, fileContents, encoding);
        },

        deleteFile: function (/*String*/fileName) {
            //summary: deletes a file or directory if it exists.
            var files, i, stat;
            if (file.exists(fileName)) {
                stat = fs.statSync(fileName);
                if (stat.isDirectory()) {
                    files = fs.readdirSync(fileName);
                    for (i = 0; i < files.length; i++) {
                        this.deleteFile(path.join(fileName, files[i]));
                    }
                    fs.rmdirSync(fileName);
                } else {
                    fs.unlinkSync(fileName);
                }
            }
        },


        /**
         * Deletes any empty directories under the given directory.
         */
        deleteEmptyDirs: function (startDir) {
            var dirFileArray, i, fileName, filePath, stat;

            if (file.exists(startDir)) {
                dirFileArray = fs.readdirSync(startDir);
                for (i = 0; i < dirFileArray.length; i++) {
                    fileName = dirFileArray[i];
                    filePath = path.join(startDir, fileName);
                    stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        file.deleteEmptyDirs(filePath);
                    }
                }

                //If directory is now empty, remove it.
                if (fs.readdirSync(startDir).length ===  0) {
                    file.deleteFile(startDir);
                }
            }
        }
    };

    return file;

});

}

if(env === 'rhino') {
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Helper functions to deal with file I/O.

/*jslint plusplus: false */
/*global java: false, define: false */

define('rhino/file', ['prim'], function (prim) {
    var file = {
        backSlashRegExp: /\\/g,

        exclusionRegExp: /^\./,

        getLineSeparator: function () {
            return file.lineSeparator;
        },

        lineSeparator: java.lang.System.getProperty("line.separator"), //Java String

        exists: function (fileName) {
            return (new java.io.File(fileName)).exists();
        },

        parent: function (fileName) {
            return file.absPath((new java.io.File(fileName)).getParentFile());
        },

        normalize: function (fileName) {
            return file.absPath(fileName);
        },

        isFile: function (path) {
            return (new java.io.File(path)).isFile();
        },

        isDirectory: function (path) {
            return (new java.io.File(path)).isDirectory();
        },

        /**
         * Gets the absolute file path as a string, normalized
         * to using front slashes for path separators.
         * @param {java.io.File||String} file
         */
        absPath: function (fileObj) {
            if (typeof fileObj === "string") {
                fileObj = new java.io.File(fileObj);
            }
            return (fileObj.getCanonicalPath() + "").replace(file.backSlashRegExp, "/");
        },

        getFilteredFileList: function (/*String*/startDir, /*RegExp*/regExpFilters, /*boolean?*/makeUnixPaths, /*boolean?*/startDirIsJavaObject) {
            //summary: Recurses startDir and finds matches to the files that match regExpFilters.include
            //and do not match regExpFilters.exclude. Or just one regexp can be passed in for regExpFilters,
            //and it will be treated as the "include" case.
            //Ignores files/directories that start with a period (.) unless exclusionRegExp
            //is set to another value.
            var files = [], topDir, regExpInclude, regExpExclude, dirFileArray,
                i, fileObj, filePath, ok, dirFiles;

            topDir = startDir;
            if (!startDirIsJavaObject) {
                topDir = new java.io.File(startDir);
            }

            regExpInclude = regExpFilters.include || regExpFilters;
            regExpExclude = regExpFilters.exclude || null;

            if (topDir.exists()) {
                dirFileArray = topDir.listFiles();
                for (i = 0; i < dirFileArray.length; i++) {
                    fileObj = dirFileArray[i];
                    if (fileObj.isFile()) {
                        filePath = fileObj.getPath();
                        if (makeUnixPaths) {
                            //Make sure we have a JS string.
                            filePath = String(filePath);
                            if (filePath.indexOf("/") === -1) {
                                filePath = filePath.replace(/\\/g, "/");
                            }
                        }

                        ok = true;
                        if (regExpInclude) {
                            ok = filePath.match(regExpInclude);
                        }
                        if (ok && regExpExclude) {
                            ok = !filePath.match(regExpExclude);
                        }

                        if (ok && (!file.exclusionRegExp ||
                            !file.exclusionRegExp.test(fileObj.getName()))) {
                            files.push(filePath);
                        }
                    } else if (fileObj.isDirectory() &&
                              (!file.exclusionRegExp || !file.exclusionRegExp.test(fileObj.getName()))) {
                        dirFiles = this.getFilteredFileList(fileObj, regExpFilters, makeUnixPaths, true);
                        files.push.apply(files, dirFiles);
                    }
                }
            }

            return files; //Array
        },

        copyDir: function (/*String*/srcDir, /*String*/destDir, /*RegExp?*/regExpFilter, /*boolean?*/onlyCopyNew) {
            //summary: copies files from srcDir to destDir using the regExpFilter to determine if the
            //file should be copied. Returns a list file name strings of the destinations that were copied.
            regExpFilter = regExpFilter || /\w/;

            var fileNames = file.getFilteredFileList(srcDir, regExpFilter, true),
            copiedFiles = [], i, srcFileName, destFileName;

            for (i = 0; i < fileNames.length; i++) {
                srcFileName = fileNames[i];
                destFileName = srcFileName.replace(srcDir, destDir);

                if (file.copyFile(srcFileName, destFileName, onlyCopyNew)) {
                    copiedFiles.push(destFileName);
                }
            }

            return copiedFiles.length ? copiedFiles : null; //Array or null
        },

        copyFile: function (/*String*/srcFileName, /*String*/destFileName, /*boolean?*/onlyCopyNew) {
            //summary: copies srcFileName to destFileName. If onlyCopyNew is set, it only copies the file if
            //srcFileName is newer than destFileName. Returns a boolean indicating if the copy occurred.
            var destFile = new java.io.File(destFileName), srcFile, parentDir,
            srcChannel, destChannel;

            //logger.trace("Src filename: " + srcFileName);
            //logger.trace("Dest filename: " + destFileName);

            //If onlyCopyNew is true, then compare dates and only copy if the src is newer
            //than dest.
            if (onlyCopyNew) {
                srcFile = new java.io.File(srcFileName);
                if (destFile.exists() && destFile.lastModified() >= srcFile.lastModified()) {
                    return false; //Boolean
                }
            }

            //Make sure destination dir exists.
            parentDir = destFile.getParentFile();
            if (!parentDir.exists()) {
                if (!parentDir.mkdirs()) {
                    throw "Could not create directory: " + parentDir.getCanonicalPath();
                }
            }

            //Java's version of copy file.
            srcChannel = new java.io.FileInputStream(srcFileName).getChannel();
            destChannel = new java.io.FileOutputStream(destFileName).getChannel();
            destChannel.transferFrom(srcChannel, 0, srcChannel.size());
            srcChannel.close();
            destChannel.close();

            return true; //Boolean
        },

        /**
         * Renames a file. May fail if "to" already exists or is on another drive.
         */
        renameFile: function (from, to) {
            return (new java.io.File(from)).renameTo((new java.io.File(to)));
        },

        readFile: function (/*String*/path, /*String?*/encoding) {
            //A file read function that can deal with BOMs
            encoding = encoding || "utf-8";
            var fileObj = new java.io.File(path),
                    input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(fileObj), encoding)),
                    stringBuffer, line;
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }
                while (line !== null) {
                    stringBuffer.append(line);
                    stringBuffer.append(file.lineSeparator);
                    line = input.readLine();
                }
                //Make sure we return a JavaScript string and not a Java string.
                return String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
        },

        readFileAsync: function (path, encoding) {
            var d = prim();
            try {
                d.resolve(file.readFile(path, encoding));
            } catch (e) {
                d.reject(e);
            }
            return d.promise;
        },

        saveUtf8File: function (/*String*/fileName, /*String*/fileContents) {
            //summary: saves a file using UTF-8 encoding.
            file.saveFile(fileName, fileContents, "utf-8");
        },

        saveFile: function (/*String*/fileName, /*String*/fileContents, /*String?*/encoding) {
            //summary: saves a file.
            var outFile = new java.io.File(fileName), outWriter, parentDir, os;

            parentDir = outFile.getAbsoluteFile().getParentFile();
            if (!parentDir.exists()) {
                if (!parentDir.mkdirs()) {
                    throw "Could not create directory: " + parentDir.getAbsolutePath();
                }
            }

            if (encoding) {
                outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile), encoding);
            } else {
                outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile));
            }

            os = new java.io.BufferedWriter(outWriter);
            try {
                os.write(fileContents);
            } finally {
                os.close();
            }
        },

        deleteFile: function (/*String*/fileName) {
            //summary: deletes a file or directory if it exists.
            var fileObj = new java.io.File(fileName), files, i;
            if (fileObj.exists()) {
                if (fileObj.isDirectory()) {
                    files = fileObj.listFiles();
                    for (i = 0; i < files.length; i++) {
                        this.deleteFile(files[i]);
                    }
                }
                fileObj["delete"]();
            }
        },

        /**
         * Deletes any empty directories under the given directory.
         * The startDirIsJavaObject is private to this implementation's
         * recursion needs.
         */
        deleteEmptyDirs: function (startDir, startDirIsJavaObject) {
            var topDir = startDir,
                dirFileArray, i, fileObj;

            if (!startDirIsJavaObject) {
                topDir = new java.io.File(startDir);
            }

            if (topDir.exists()) {
                dirFileArray = topDir.listFiles();
                for (i = 0; i < dirFileArray.length; i++) {
                    fileObj = dirFileArray[i];
                    if (fileObj.isDirectory()) {
                        file.deleteEmptyDirs(fileObj, true);
                    }
                }

                //If the directory is empty now, delete it.
                if (topDir.listFiles().length === 0) {
                    file.deleteFile(String(topDir.getPath()));
                }
            }
        }
    };

    return file;
});

}

if(env === 'browser') {
/*global process */
define('browser/quit', function () {
    'use strict';
    return function (code) {
    };
});
}

if(env === 'node') {
/*global process */
define('node/quit', function () {
    'use strict';
    return function (code) {
        return process.exit(code);
    };
});
}

if(env === 'rhino') {
/*global quit */
define('rhino/quit', function () {
    'use strict';
    return function (code) {
        return quit(code);
    };
});

}

if(env === 'browser') {
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, console: false */

define('browser/print', function () {
    function print(msg) {
        console.log(msg);
    }

    return print;
});

}

if(env === 'node') {
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, console: false */

define('node/print', function () {
    function print(msg) {
        console.log(msg);
    }

    return print;
});

}

if(env === 'rhino') {
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint strict: false */
/*global define: false, print: false */

define('rhino/print', function () {
    return print;
});

}
/**
 * @license RequireJS Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/*jslint nomen: false, strict: false */
/*global define: false */

define('logger', ['env!env/print'], function (print) {
    var logger = {
        TRACE: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        SILENT: 4,
        level: 0,
        logPrefix: "",

        logLevel: function( level ) {
            this.level = level;
        },

        trace: function (message) {
            if (this.level <= this.TRACE) {
                this._print(message);
            }
        },

        info: function (message) {
            if (this.level <= this.INFO) {
                this._print(message);
            }
        },

        warn: function (message) {
            if (this.level <= this.WARN) {
                this._print(message);
            }
        },

        error: function (message) {
            if (this.level <= this.ERROR) {
                this._print(message);
            }
        },

        _print: function (message) {
            this._sysPrint((this.logPrefix ? (this.logPrefix + " ") : "") + message);
        },

        _sysPrint: function (message) {
            print(message);
        }
    };

    return logger;
});
//Just a blank file to use when building the optimizer with the optimizer,
//so that the build does not attempt to inline some env modules,
//like Node's fs and path.

//Commit 465a4eae86c7bae191b1ee427571543ace777117 on July 19, 2012
define('esprima', ['exports'], function(exports) {
/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, exports:true,
throwError: true, createLiteral: true, generateStatement: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true */

(function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages