import _ from 'lodash';
import Immutable from 'immutable';

function serializerFactory() {
  const serializableKeys = [
    'siteName',
    '_versionNumber',
    'pages',
    'componentMap',
    'ourComponentBoxes',
    'yourComponentBoxes',
    'assets',
    'componentsMap',
    'recentSites'
  ];

  function serialize(state) {
    let serializableState = _.pick(state.toJS(), serializableKeys);
    return JSON.stringify(serializableState);
  }

  function deserialize(jsonState) {
    return Immutable.fromJS(JSON.parse(jsonState));
  }

  return { serialize, deserialize };
}

const serializer = serializerFactory();

export default serializer;
