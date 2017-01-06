import _ from "lodash";
import React from "react";
import {Rect} from "./utils.js";
import $ from 'jquery';
import {guid} from './utils.js'
import classnames from 'classnames';
/* TD: fix circular deps */
import {actionDispatch} from './stateManager.js';
import {dragManager} from './dragManager.js';

/* Field Types */
export const TEXT_FIELD = 'TEXT_FIELD'; /* fieldSettings:  */
export const LARGE_TEXT_FIELD = 'LARGE_TEXT_FIELD'; /* fieldSettings:  */
export const NUMBER = 'NUMBER'; /* fieldSettings: eventually allow for multi-value */
export const COLOR = 'COLOR'; /* fieldSettings:  */
export const DROPDOWN = 'DROPDOWN'; /* fieldSettings: choices - {name: , value: } */
export const TOGGLE = 'TOGGLE' /*  */

/* Component Types */
export const CONTAINER = 'CONTAINER';
export const HEADER = 'HEADER';
export const TEXT = 'TEXT';
export const IMAGE = 'IMAGE';

export var getInsertionSpacerId = function (parent, insertionInd, view) {
  return [parent, insertionInd, view].join("_");
}

/* Attribute Fieldset */
export var attributeFieldset = {
  position: {
    fieldType: DROPDOWN,
    fieldSettings: {
      choices: [
        "static",
        "absolute"
      ]
    }
  },
  flexDirection: {
    fieldType: DROPDOWN,
    fieldSettings: {
      choices: [
        "column",
        "row"
      ]
    }
  },
  justifyContent: {
    fieldType: DROPDOWN,
    fieldSettings: {
      choices: [
        "flex-start",
        "flex-end",
        "center",
        "space-between",
        "space-around"
      ]
    }
  },
  width: {
    fieldType: TEXT_FIELD,
    fieldSetting: {}
  },
  minWidth: {
    fieldType: TEXT_FIELD,
    fieldSetting: {}
  },
  maxWidth: {
    fieldType: TEXT_FIELD,
    fieldSettings: {}
  },
  height: {
    fieldType: TEXT_FIELD,
    fieldSettings: {}
  },
  backgroundColor: {
    fieldType: COLOR,
    fieldSettings: {}
  }
}

class Component {
  constructor(componentType, spec) {
    this.attributes = {};
    this.children = [];
    this._variants = [];
    this.master = undefined;
    this.parent = undefined;

    _.merge(this, spec);

    this.componentType = componentType;
    this.id = guid();
    this["###domElements"] = {};
  }

  getSerializableData() {
    return [
      'attributes',
      'children',
      'master',
      'parent',
      '_variants',
      'id',
      'componentType',
      'name',
    ].reduce((dataObj, key) => {
      dataObj[key] = this[key];

      return dataObj;
    }, {});
  }

  createVariant(spec) {
    var variant = Object.create(this);

    variant.constructor(Object.assign(spec || {}, {
      master: this
    }));

    _.forEach(this.children, function(child) {
      variant.addChild(child.createVariant());
    });

    this._variants.push(variant);

    return variant;
  }

  addChild(child, ind) {
    this._variants.forEach(function(variant) {
      variant.addChild(child, ind);
    });

    child.parent = this;
    if (ind === undefined) {
      this.children.push(child);
    } else {
      this.children.splice(ind, 0, child);
    }
  }

  removeChild(child) {
    /*
       May have an issue with things not getting gc'd might be refs still from something that considers this a variant.
     */

    _.remove(this.children, function(parentsChild) {
      return parentsChild.id === child.id;
    });

    delete child.parent;

    return child;
  }

  deleteSelf() {
    this.parent.removeChild(this);
    _.remove(this.master._variants, (variant) => {
      return variant === this.id;
    });
  }

  getAllAttrs() {
    var masterAttrs = {};
    if (this.master) {
      masterAttrs = this.master.getAllAttrs();
    }

    return Object.assign({}, masterAttrs, this.attributes);
  }

  getRenderableProperties() {
    /* Func transform goes here */
    var attrToCssLookup = {
    }

    var attrToHtmlPropertyLookup = {
      text: true,
    }

    return _.reduce(this.getAllAttrs(), function(renderableAttributes, attrVal, attrKey) {
      if (attrToHtmlPropertyLookup[attrKey]) {
        renderableAttributes.htmlProperties[attrKey] = attrVal;
      } else if (attrToCssLookup[attrKey]) {
        Object.assign(renderableAttributes.sx, attrToCssLookup[attrKey](attrVal));
      } else {
        renderableAttributes.sx[attrKey] = attrVal;
      }

      return renderableAttributes;
    }, {
      htmlProperties: {},
      sx: {}
    });
  }

  getRect(elementType) {
    var el = this['###domElements'][elementType];

    if (!el) {
      return false;
    }

    return new Rect().fromElement($(el));
  }

  isLastChild() {
    if (!this.parent) {
      return false;
    }
    return _.last(this.parent.children).id === this.id;
  }

  isFirstChild() {
    if (!this.parent) {
      return false;
    }
    return _.first(this.parent.children).id === this.id;
  }

  getInd() {
    return this.parent.children.indexOf(function(child) {
      return child.id === this.id;
    });
  }

  walkChildren(func, ind, isChild) {
    if (isChild) {
      func(this, ind);
    }

    this.children.forEach(function (child, ind) {
      child.walkChildren(func, ind, true);
    });
  }
}

const defaultAttributes = {
  position: "static",
  margin: "0px",
  padding: "0px",
  height: "auto",
  width: "auto",
  backgroundColor: "transparent"
}

export class Container extends Component {
  constructor(spec) {
    var defaultSpec = {
      name: "Container",
      attributes: _.extend(defaultSpec, {
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start"
      }),
      childrenAllowed: true
    }

    super(CONTAINER, spec || defaultSpec);
  }

  getDropPoints() {
    var rect = this.getRect("pageView");
    var attrs = this.getAllAttrs();
    var flexDirection = attrs.flexDirection;
    var initialPoints;
    var hasNoChildren = this.children.length === 0;
    var padding = 2;

    if (flexDirection === "column") {
      initialPoints = [{x: rect.x, y: rect.y + padding}, {x: rect.x + rect.w, y: rect.y + padding}];
    } else if (flexDirection === "row") {
      initialPoints = [{x: rect.x + padding, y: rect.y}, {x: rect.x + padding, y: rect.y + rect.h}];
    }

    var dropPoints = [
      {
        insertionIndex: 0,
        parent: this,
        points: initialPoints
      }
    ];

    this.children.forEach((child, ind) => {
      var rect = child.getRect("pageView");
      var points;

      if (flexDirection === "column") {
        points = [{x: rect.x, y: rect.y + rect.h}, {x: rect.x + rect.w, y: rect.y + rect.h}];
      } else if (flexDirection === "row") {
        points = [{x: rect.x + rect.w, y: rect.y}, {x: rect.x + rect.w, y: rect.y + rect.h}];
      }

      dropPoints.push({
        insertionIndex: ind + 1,
        parent: this,
        points: points
      })
    });

    return dropPoints;
  }
}

export class Text extends Component {
  constructor(spec) {
    var defaultSpec = {
      name: "Text",
      attributes: _.extend(defaultAttributes, {
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In quis libero at libero dictum tempor. Cras ut odio erat. Fusce semper odio ac dignissim sollicitudin. Vivamus in tortor lobortis, bibendum lacus feugiat, vestibulum magna. Vivamus pellentesque mollis turpis, at consequat nisl tincidunt at. Nullam finibus cursus varius. Nam id consequat nunc, vitae accumsan metus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Suspendisse fringilla sed lorem eleifend porta. Vivamus euismod, sapien at pretium convallis, elit libero auctor felis, id porttitor dui leo id ipsum. Etiam urna velit, ornare condimentum tincidunt quis, tincidunt a dolor. Morbi at ex hendrerit, vestibulum tellus eu, rhoncus est. In rutrum, diam dignissim condimentum tristique, ante odio rhoncus justo, quis maximus elit orci id orci."
      })
    }

    super(TEXT, spec || defaultSpec);
  }
}

export class Header extends Component {
  constructor(spec) {
    var defaultSpec = {
      name: "Header",
      attributes: _.extend(defaultAttributes, {
        text: "I am a header"
      })
    }

    super(HEADER, spec || defaultSpec);
  }
}

export class Image extends Component {
  constructor(spec) {
    var defaultSpec = {
      name: "Image",
      attributes: _.extend(defaultAttributes, {
        src: './public/img/slack/everywhere.png'
      }),
      isBlock: true,
    }

    super(IMAGE, spec || defaultSpec);
  }
}

export let container = new Container();
export let text = new Text();
export let header = new Header();
export let image = new Image();
