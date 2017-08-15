'use strict';

const dom = require('@okwolo/dom');
const state = require('@okwolo/state');
const router = require('@okwolo/router');
const history = require('@okwolo/history')();
const {isFunction, assert, deepCopy, isBrowser} = require('@okwolo/utils')();

const okwolo = (rootElement, _window = window) => {
    const domHandler = dom(rootElement, _window);
    const stateHandler = state();
    const routeHandler = router(_window);

    const initial = {};
    let _state = initial;

    // forwarding use calls
    const use = (blob) => {
        [domHandler, stateHandler, routeHandler]
            .forEach((module) => module.use(blob));
    };

    // adding blobs
    [history]
        .forEach((blob) => use(blob));

    // add watcher to keep track of current state
    use({watcher:
        (newState) => _state = newState,
    });

    // add watcher to update dom
    use({watcher:
        (newState) => domHandler.exec({state: newState}),
    });

    // add action to override state
    use({action: {
        type: '__OVERRIDE__',
        target: [],
        handler: (target, params) => params,
    }});

    const update = () => {
        domHandler.exec({state: _state});
    };

    // adding currentState and forwarding act calls
    const act = (type, params) => {
        assert(_state !== initial || type === '__OVERRIDE__', 'act : cannot act on state before it has been set');
        if (isFunction(type)) {
            stateHandler.exec({act: {state: _state, type: '__OVERRIDE__', params: type(deepCopy(_state))}});
            return;
        }
        stateHandler.exec({act: {state: _state, type, params}});
    };

    // override state
    const setState = (replacement) => {
        if (isFunction(replacement)) {
            act('__OVERRIDE__', replacement(deepCopy(_state)));
            return;
        }
        act('__OVERRIDE__', replacement);
    };

    // register a route/controller combo
    const register = (path, builder) => {
        if (isFunction(path)) {
            use({builder: path()});
            return;
        }
        use({route: {
            path,
            callback: (params) => {
                use({builder: builder(params)});
            },
        }});
    };

    // making it easier to use undo/redo
    const undo = () => {
        act('UNDO', {});
    };
    const redo = () => {
        act('REDO', {});
    };

    const getState = () => {
        assert(_state !== initial, 'getState : cannot get state before it has been set');
        return deepCopy(_state);
    };

    return Object.assign(register, {
        setState,
        getState,
        redirect: (path, params) => routeHandler.exec({redirect: {path, params}}),
        show: (path, params) => routeHandler.exec({show: {path, params}}),
        act,
        use,
        update,
        undo,
        redo,
    });
};

// making the okwolo function available as an import or in the global window object
if (typeof module !== 'undefined' && module.exports) {
    module.exports = okwolo;
}
if (isBrowser()) {
    window.okwolo = okwolo;
}
