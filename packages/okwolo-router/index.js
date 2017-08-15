'use strict';

const {assert, isString, isObject, isFunction, bus} = require('@okwolo/utils')();

const createDefaultBlob = require('./blob');

const router = (_window = window) => {
    const isHosted = _window.document.origin !== null && _window.document.origin !== 'null';

    let baseUrl = '';
    let register;
    let fetch;

    let hasMatched = false;

    const safeFetch = (...args) => {
        assert(isFunction(fetch), 'router.fetch : fetch is not a function', fetch);
        fetch(...args);
    };

    let removeBaseUrl = (path) => {
        return path.replace(new RegExp('\^' + baseUrl), '') || '';
    };

    let currentPath = _window.location.pathname;
    if (!isHosted) {
        currentPath = '';
    }

    // handle back/forward events
    _window.onpopstate = () => {
        currentPath = removeBaseUrl(_window.location.pathname);
        safeFetch(currentPath);
    };

    const exec = bus();

    // fetch wrapper that makes the browser aware of the url change
    exec.on('redirect', ({path, params = {}} = {}) => {
        assert(isString(path), 'router.redirect : path is not a string', path);
        assert(isObject(params), 'router.redirect : params is not an object', params);
        currentPath = path;
        if (isHosted) {
            /* edge doesn't care that the file is local and will allow pushState.
                it also includes "/C:" in the location.pathname, but adds it to
                the path given to pushState. which means it needs to be removed here */
            _window.history.pushState({}, '', (baseUrl + currentPath).replace(/^\/C\:/, ''));
        } else {
            console.log(`@okwolo/router:: path changed to\n>>> ${currentPath}`);
        }
        safeFetch(currentPath, params);
    });

    // fetch wrapper which does not change the url
    exec.on('show', ({path, params = {}} = {}) => {
        assert(isString(path), 'router.show : path is not a string', path);
        assert(isObject(params), 'router.show : params is not an object', params);
        return safeFetch(path, params);
    });

    const use = bus();

    // register wrapper that runs the current page's url against new routes
    use.on('route', ({path, callback} = {}) => {
        assert(isString(path), 'router.use.route : path is not a string', path);
        assert(isFunction(callback), 'router.use.route : callback is not a function', path, callback);
        assert(isFunction(register), 'route.use.route : register is not a function', register);
        register(path, callback);
        if (!hasMatched) {
            hasMatched = !!safeFetch(currentPath);
        }
    });

    // replace the base url, adjust the current and try to fetch with the new url
    use.on('base', (base) => {
        assert(isString(base), 'router.use.base : base url is not a string', base);
        baseUrl = base;
        currentPath = removeBaseUrl(currentPath);
        safeFetch(currentPath);
    });

    use.on('register', (_register) => {
        assert(isFunction(_register), 'router.use.register : register is not a function', register);
        register = _register;
    });

    use.on('fetch', (_fetch) => {
        assert(isFunction(_fetch), 'router.use.fetch : fetch is not a function', fetch);
        fetch = _fetch;
    });

    use(createDefaultBlob(_window));

    return {exec, use};
};

module.exports = router;
