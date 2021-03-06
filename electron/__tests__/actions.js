var _ = require('lodash');

var { getNewStore, actions } = require('../app/stateManager.js');
var { componentTypes } = require('../app/constants.js');
var { container, ComponentsContainer } = require('../app/base_components.js');

describe('make component block', () => {
  var store = getNewStore();
  const state = store.getState();
  const currentPageId = state.get('currentPageId');
  const rootComponentTreeId = state.getIn([
    'pages',
    state.getIn(['editorView', 'currentPageId']),
    'componentTreeId'
  ]);

  store.dispatch(actions.addVariant(
    container.get('id'),
    rootComponentTreeId,
  ));

  const newBlockId = store.getState().getIn([
    'componentsMap',
    rootComponentTreeId,
    'childIds',
    0
  ]);

  store.dispatch(actions.createComponentBlock(newBlockId));

  it('Removes parent', () => {
    const state = store.getState();
    expect(state.getIn(['componentsMap', newBlockId, 'parentId'])).toBeUndefined();
  });
});
