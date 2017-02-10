import React from 'react';
import _ from 'lodash';
import classnames from 'classnames';
import { DragSource } from 'react-dnd';

import { dragTypes, componentTypes } from '../constants';
import { wasRightButtonPressed, globalEventManager } from '../utils';

const Spacer = function (props) {
  let sx, indexMarker;
  const { index, nodeId, isActive, isNear } = props;

  if (isActive) {
    sx = {
      border: '1px solid #FF8D80',
      marginTop: 1,
    };
  } else if (isNear) {
    sx = {
      border: '1px solid #FFDCD8',
      marginTop: 1,
    };
  } else {
    sx = {
      border: '0px solid #FFDCD8',
      marginTop: 0,
    };
  }

  if (index === undefined) {
    indexMarker = 'emptyChild';
  } else {
    indexMarker = index;
  }

  return (
    <div
        style={sx}
        className={'spacer treeDropSpot_' + nodeId + '_' + indexMarker}
    />
  );
};

function checkActive(parentId, dropPoint, ind) {
  if (!dropPoint) { return false; }

  return (
    dropPoint.parentId === parentId &&
    dropPoint.insertionIndex === ind &&
    !dropPoint.isDraggedComponent
  );
}

const ComponentTree = React.createClass({
  render() {
    let children;
    let afterSpacer, beforeSpacer, afterSpacerInd;
    let {
      context,
      node,
      actions
    } = this.props;

    const {
      otherPossibleTreeViewDropSpots,
      selectedTreeViewDropSpot,
      activeComponentId,
      hoveredComponentId
    } = context;

    const treeItemIsActive = node.id === activeComponentId;
    const treeItemIsHovered = node.id === hoveredComponentId;

    if (node.parent) {
      if (node.index === 0) {
        beforeSpacer = (
          <Spacer
              nodeId={node.id}
              index={node.index}
              isActive={checkActive(node.parent.id, selectedTreeViewDropSpot, 0)}
              isNear={_.some(otherPossibleTreeViewDropSpots, (dspot) => {
                  return checkActive(node.parent.id, dspot, 0);
                })}
          />
        );
      }

      afterSpacerInd = node.index + 1;
      afterSpacer = (
        <Spacer
            nodeId={node.id}
            index={afterSpacerInd}
            isActive={checkActive(
                node.parent.id,
                selectedTreeViewDropSpot,
                afterSpacerInd
              )}
            isNear={_.some(otherPossibleTreeViewDropSpots, (dspot) => {
                return checkActive(node.parent.id, dspot, afterSpacerInd);
              })}
        />
      );
    }

    children = (
      <TreeChildren
          parentId={node.id}
          children={node.children}
          context={context}
          actions={actions}
      />
    );

    return (
      <div>
        {beforeSpacer}
        <TreeItem
            {...this.props}
            isActive={treeItemIsActive}
            isHovered={treeItemIsHovered}
            actions={actions}
        />
        {children}
        {afterSpacer}
      </div>
    );
  },
});

const TreeItem = DragSource(
  dragTypes.MOVE_COMPONENT,
  {
    beginDrag(props) {
      let prevPoint = {};
      const id = globalEventManager.addListener('drag', (e) => {
        if (e.clientX !== prevPoint.x
            && e.clientY !== prevPoint.y
            && (e.clientX && e.clientY)) {
          prevPoint = {
            x: e.clientX,
            y: e.clientY
          }

          props.actions.updateTreeViewDropSpots(
            {
              x: e.clientX,
              y: e.clientY,
            },
            props.node.id
          );
        }
      }, 1);
      return { id };
    },
    endDrag(props, monitor) {
      globalEventManager.removeListener('drag', monitor.getItem().id);
      const selectedTreeViewDropSpot = props.context.selectedTreeViewDropSpot;
      if (selectedTreeViewDropSpot &&
          !selectedTreeViewDropSpot.isDraggedComponent) {
        props.actions.moveComponent(
          props.node.id,
          selectedTreeViewDropSpot.parentId,
          selectedTreeViewDropSpot.insertionIndex,
        );
      }
      props.actions.resetTreeViewDropSpots();
    }
  },
  function (connect) {
    return {
      connectDragSource: connect.dragSource()
    }
  }
)(
  React.createClass({
    onMouseUp(e) {
      if (wasRightButtonPressed(e)) {
        this.props.actions.openMenu(
          this.props.node.id,
          e.clientX,
          e.clientY
        );
      } else {
        this.props.actions.selectComponent(this.props.node.id);
      }
      e.stopPropagation();
    },
    render() {
      const {
        node,
        className,
        isActive,
        isHovered,
        onMouseDown
      } = this.props;

      if (componentTypes.ROOT === node.componentType) {
        return <span />;
      } else {
        const treeItemClassName = classnames(
          'treeItem w-100 pv1',
          className,
          'outline_' + node.id,
          {
            highlightBottom: false,
            isActive,
            isHovered
          },
          'db'
        );

        return this.props.connectDragSource(
          <span
              onMouseDown={onMouseDown}
              onMouseEnter={() => {
                  this.props.actions.hoverComponent(node.id)
                }}
              onMouseLeave={() => { this.props.actions.unHoverComponent() }}
              onMouseUp={this.onMouseUp}
              className={treeItemClassName}>
            {node.name}
          </span>
        );
      }
    },
  })
);


const TreeChildren = React.createClass({
  render() {
    let emptySpacer;
    const { parentId, context } = this.props;
    const children = _.map(this.props.children, (child) => {
      return (
        <ComponentTree
            context={this.props.context}
            actions={this.props.actions}
            node={child}
            key={child.id}
        />
      );
    });

    if (this.props.children.length === 0) {
        emptySpacer = (
          <Spacer
              nodeId={this.props.parentId}
              isActive={checkActive(
                  parentId,
                  context.selectedTreeViewDropSpot,
                  0
                )}
              isNear={_.some(context.otherPossibleTreeViewDropSpots, (dspot) => {
                  return checkActive(
                    parentId,
                    dspot,
                    0
                  );
                })}
          />
        );
    }

    return (
      <div className="ml2">
        {emptySpacer}
        {children}
      </div>
    );
  },
});

export default ComponentTree;
