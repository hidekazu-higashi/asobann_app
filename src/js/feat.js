import {el, mount, setAttr, setStyle, unmount} from "redom";
import {allCardistry} from "./cardistry.js";
import {_, language} from "./i18n.js";
import {dev_inspector} from "./dev_inspector.js"
import {toolbox} from "./toolbox.js";

import interact from 'interactjs';
import {Level} from "./table";

function toRect(c) {
  if (c.rect) {
    return c.rect;
  }
  if (c.left !== undefined && c.top !== undefined && c.width !== undefined && c.height !== undefined) {
    return {
      left: parseFloat(c.left),
      top: parseFloat(c.top),
      width: parseFloat(c.width),
      height: parseFloat(c.height),
    }
  }
  if (c.el) {
    return {
      left: parseFloat(c.el.style.left),
      top: parseFloat(c.el.style.top),
      width: parseFloat(c.el.style.width),
      height: parseFloat(c.el.style.height),
    }
  }
  throw 'Cannot detect rect';
}

const basic = {
  install: function(component, data) {
    if (data.showImage) {
      if (component.imageEl == null) {
        component.imageEl = el("img", {
          draggable: false
        });
        component.imageEl.ondragstart = () => {
          return false;
        };
        mount(component.el, component.imageEl);
      }
      if (data.image) {
        setAttr(component.imageEl, {
          src: data.image
        });
      }
    } else {
      component.imageEl = null;
    }

    component.rect = {
      left: data.left,
      top: data.top,
      width: data.width,
      height: data.height,
    };

  },
  isEnabled: function() {
    return true;
  },
  receiveData(component, data) {
    component.rect.left = parseFloat(data.left);
    component.rect.top = parseFloat(data.top);
    component.rect.width = parseFloat(data.width);
    component.rect.height = parseFloat(data.height);
    component.zIndex = data.zIndex;
  },
  updateView(component, data) {
    if (data.showImage) {
      if (component.imageEl.src !== data.image) {
        setAttr(component.imageEl, {
          src: data.image
        });
      }
    }

    if (component.textEl == null) {
      if (data.toolboxFunction) {
        component.textEl = el("button.component_text", {
          onclick: () => {
            toolbox.use(data.toolboxFunction);
          }
        });
        if (component.el.children.length > 0) {
          mount(component.el, el('div', [component.textEl]), component.el.children[0]);
        } else {
          mount(component.el, el('div', [component.textEl]));
        }
      } else {
        component.textEl = el("span.component_text");
        if (component.el.children.length > 0 && component.el.children[0].tagName !== 'IMG') {
          mount(component.el, el('div', [component.textEl]), component.el.children[0]);
        } else {
          mount(component.el, el('div', [component.textEl]));
        }
      }
    }
    if (data.text) {
      if (data["text_" + language]) {
        component.textEl.innerText = data["text_" + language];
      } else {
        component.textEl.innerText = data.text;
      }
    }
    if (data.textColor) {
      setStyle(component.textEl, {
        color: data.textColor
      });
    }
    if (data.textAlign) {
      switch (data.textAlign.trim()) {
        case 'center':
          setStyle(component.textEl, {
            "text-align": "center",
            "vertical-align": "center",
          });
          break;
        case 'center bottom':
          setStyle(component.textEl, {
            "text-align": "center",
            "bottom": 0,
          });
          break;
        default:
          console.warn(`unsupported textAlign "${data.textAlign}"`);
      }
    }

    setAttr(component.el, {
      'data-component-name': data.name,
    });

    // 厳密に undefined か評価するとき (null も同様)
    if (data.transData === undefined) {
      data.transData = 0;
    }

    setStyle(component.el, {
      left: parseFloat(data.left) + "px",
      top: parseFloat(data.top) + "px",
      width: parseFloat(data.width) + "px",
      height: parseFloat(data.height) + "px",
      backgroundColor: data.color,
      zIndex: component.zIndex,
      transform: "rotate(" + String(data.transData * 45)+ "deg)",
    });
  },
  uninstall: function() {},
}

const draggability = {
  featName: 'draggability',
  move: function(component, data, event) {
    component.applyUserAction(Level.A, () => {
      featsContext.fireEvent(component, draggability.events.onMoving, {
        left: (component.rect.left + event.dx) + 'px',
        top: (component.rect.top + event.dy) + 'px',
        dx: event.dx,
        dy: event.dy,
      });
    });
  },
  end: function(component, data, event) {
    component.applyUserAction(Level.B, () => {
      featsContext.fireEvent(component, featsContext.events.onPositionChanged, {
        // イベント終了時に発行
        // left: (component.rect.left + event.dx) + 'px',
        // top: (component.rect.top + event.dy) + 'px',
        left: component.rect.left + 'px',
        top: component.rect.top + 'px',
        width: component.rect.width,
        height: component.rect.height,
      });
      featsContext.fireEvent(component, draggability.events.onMoveEnd, {});
    });
  },
  install: function(component, data) {
    function isDraggingPermitted() {
      return component.draggable && featsContext.canOperateOn(component);
    }

    if (!data.draggable) {
      return;
    }

    interact(component.el).draggable({
      listeners: {
        move(event) {
          if (!isDraggingPermitted()) {
            return;
          }
          dev_inspector.startTrace('draggability.move');
          dev_inspector.tracePoint('event listener');
          draggability.move(component, data, event);
          dev_inspector.endTrace();
        },
        end(event) {
          if (!isDraggingPermitted()) {
            return;
          }
          dev_inspector.startTrace('draggability.end');
          dev_inspector.tracePoint('event listener');
          draggability.end(component, data, event);
          dev_inspector.tracePoint('event listener');
        }
      }
    });

    featsContext.addEventListener(component, draggability.events.onMoving, (e) => {
      // component.propagate_volatile({
      //     top: e.top + "px",
      //     left: e.left + "px",
      //     moving: true
      // });
      component.applyUserAction(Level.A, () => {
        component.propagate_volatile({
          top: e.top + "px",
          left: e.left + "px",
          moving: true
        });
      });
    });

    featsContext.addEventListener(component, featsContext.events.onPositionChanged, (e) => {
      component.applyUserAction(Level.A, () => {
        component.propagate({
          left: e.left + "px",
          top: e.top + "px",
          width: e.width + "px",
          height: e.height + "px",
          moving: false,
        });
      });

    });
  },
  isEnabled: function(component, data) {
    return data.draggable === true;
  },
  receiveData: function(component, data) {
    component.draggable = data.draggable;
    component.ownable = data.ownable; // TODO: good chance ownable will not be used
  },
  updateView: function() {

  },
  uninstall: function(component) {
    interact(component.el).draggable(false);
  },
  events: {
    onMoving: "draggability.onMoving",
    onMoveEnd: "draggability.onMoveEnd",
  }
};

const flippability = {
  install: function(component, data) {
    if (!flippability.isEnabled(component, data)) {
      return;
    }

    function isFlippingPermitted() {
      return component.flippable && featsContext.canOperateOn(component);
    }

    component.el.addEventListener("dblclick", ( eventN ) => {
      if (!isFlippingPermitted()) {
        return;
      }

      // シフト推しながらは開店
      if (eventN.shiftKey) {
          data.transData = data.transData + 1;
          if ( data.transData > 8 ){
            data.transData = 0;
          }
          component.applyUserAction(Level.A, () => {
            component.propagate({
              'transData': data.transData
            });
          });
          return;
      }

      component.applyUserAction(Level.A, () => {
        dev_inspector.startTrace('flippability.dblclick');
        dev_inspector.tracePoint('event listener');
        let diff = {};

        if (component.owner && component.owner !== featsContext.getPlayerName()) {
          return;
        }

        if (component.faceup) {
          diff.faceup = component.faceup = false;
        } else {
          diff.faceup = component.faceup = true;
        }

        component.propagate(diff);
        dev_inspector.endTrace();
      });
    });
  },
  isEnabled: function(component, data) {
    return data.flippable === true;
  },
  receiveData(component, data) {
    component.flippable = data.flippable;
    component.owner = data.owner;
    component.faceup = data.faceup;
  },
  updateView(component, data) {
    if (component.faceup) {
      if (!component.owner || component.owner === featsContext.getPlayerName()) {
        if (data.showImage) {
          if (component.imageEl.src !== data.faceupImage) {
            setAttr(component.imageEl, {
              src: data.faceupImage
            });
          }
        }
        if (data.faceupText) {
          if (data["faceupText_" + language]) {
            component.textEl.innerText = data["faceupText_" + language];
          } else {
            component.textEl.innerText = data.faceupText;
          }
        } else {
          component.textEl.innerText = '';
        }
      } else {
        if (data.showImage) {
          if (component.imageEl.src !== data.facedownImage) {
            setAttr(component.imageEl, {
              src: data.facedownImage
            });
          }
        }
        if (data.facedownText) {
          if (data["facedownText_" + language]) {
            component.textEl.innerText = data["facedownText_" + language];
          } else {
            component.textEl.innerText = data.facedownText;
          }
        } else {
          component.textEl.innerText = '';
        }
      }
    } else {
      if (data.showImage) {
        if (component.imageEl.src !== data.facedownImage) {
          setAttr(component.imageEl, {
            src: data.facedownImage
          });
        }
      }
      if (data.facedownText) {
        if (data["facedownText_" + language]) {
          component.textEl.innerText = data["facedownText_" + language];
        } else {
          component.textEl.innerText = data.facedownText;
        }
      } else {
        component.textEl.innerText = '';
      }
    }

  },
  uninstall: function(component) {},

};


const resizability = {
  install: function(component, componentData) {
    function isResizingPermitted() {
      return component.resizable && featsContext.canOperateOn(component);
    }

    if (!componentData.resizable) {
      // do not install resizability
      return;
    }

    interact(component.el).resizable({
      edges: {
        left: true,
        top: true,
        right: true,
        bottom: true,
      },
      invert: 'reposition',

      onmove: (event) => {
        if (!isResizingPermitted()) {
          return;
        }
        component.applyUserAction(Level.A, () => {
          let left = parseFloat(component.el.style.left) + event.deltaRect.left;
          let top = parseFloat(component.el.style.top) + event.deltaRect.top;
          let width = parseFloat(component.el.style.width) + event.deltaRect.width;
          let height = parseFloat(component.el.style.height) + event.deltaRect.height;
          component.propagate_volatile({
            left: left,
            top: top,
            width: width,
            height: height
          });
        });
      },
      onend: ( /*event*/ ) => {
        if (!isResizingPermitted()) {
          return;
        }
        component.applyUserAction(Level.A, () => {
          // resizeend event have wrong value in deltaRect so just ignore it
          let left = parseFloat(component.el.style.left);
          let top = parseFloat(component.el.style.top);
          let width = parseFloat(component.el.style.width);
          let height = parseFloat(component.el.style.height);
          featsContext.fireEvent(component, featsContext.events.onPositionChanged, {
            left: left,
            top: top,
            width: width,
            height: height,
          });
        });
      },
    })
  },
  isEnabled: function(component, data) {
    return data.resizable === true;
  },
  receiveData: function(component, data) {
    component.resizable = data.resizable;
  },
  updateView: function() {},
  uninstall: function(component) {
    interact(component.el).resizable(false);
  },
};

const rollability = {
  install: function(component, data) {
    function isRollingPermitted() {
      return component.rollable && featsContext.canOperateOn(component);
    }

    if (!rollability.isEnabled(component, data)) {
      return;
    }

    component.el.addEventListener("dblclick", startRoll);

    function startRoll( /*event*/ ) {
      if (!isRollingPermitted()) {
        return;
      }
      if (component.rolling) {
        return false;
      }
      component.applyUserAction(Level.C, () => {
        const duration = Math.random() * 1000 + 500;
        const finalValue = Math.floor(Math.random() * 6) + 1;
        component.rolling = true;
        component.propagate({
          rollDuration: duration,
          rollFinalValue: finalValue,
          startRoll: true
        });
      });
      return false;
    }
  },
  isEnabled: function(component, data) {
    return data.rollable === true;
  },
  receiveData(component, data) {
    component.rollable = data.rollable;

    if (data.startRoll) {
      data.startRoll = undefined;
      component.startRoll = true;
    }
  },
  updateView(component, data) {
    if (component.startRoll) {
      component.startRoll = false;
      rollability.roll(component, data.rollDuration, data.rollFinalValue);
    }

    if (data.rollFinalValue && !component.rolling) {
      if (data.rollFinalValue === component.rollCurrentValue) {
        return;
      }
      const previousEls = [];
      for (const e of component.el.children) {
        if (e.className === 'dice_image') {
          previousEls.push(e);
        }
      }
      for (const e of previousEls) {
        unmount(component.el, e);
      }
      const finalEl = el("div.dice_image", {
        style: {
          width: "100%",
          height: "100%"
        }
      });
      setStyle(finalEl, {
        animation: 'none',
        backgroundImage: `url("/static/images/dice_blue_${data.rollFinalValue}.jpg")`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'left',
        backgroundRepeat: 'no-repeat',
      });
      mount(component.el, finalEl);
      component.rollCurrentValue = data.rollFinalValue;
    }
  },
  uninstall: function(component) {},
  roll: function(component, duration, finalValue) {
    const ANIMATION_INTERVAL = 200;

    component.rolling = true;
    component.rollCurrentValue = null;
    const fromValue = Math.floor(Math.random() * 6) + 1;
    const toValue = Math.floor(Math.random() * 6) + 1;
    const startTime = Date.now();
    let previousRollingEl = null;
    for (const e of component.el.children) {
      if (e.className === 'dice_image') {
        previousRollingEl = e;
      }
    }
    showRolling(fromValue, toValue, previousRollingEl);

    function showRolling(fromValue, toValue, previousRollingEl) {
      if (previousRollingEl) {
        unmount(component.el, previousRollingEl);
      }
      // repeating animation requires new element
      const rollingEl = el("div.dice_image", {
        style: {
          width: "100%",
          height: "100%"
        }
      });
      setStyle(rollingEl, {
        animation: `dice_rolling ${ANIMATION_INTERVAL}ms linear 0s 1  `,
        backgroundImage: `url("/static/images/dice_blue_${toValue}.jpg"), url("/static/images/dice_blue_${fromValue}.jpg")`,
        backgroundPosition: 'left, right',
        backgroundRepeat: 'no-repeat, no-repeat',
      });
      mount(component.el, rollingEl);

      if (Date.now() < startTime + duration - ANIMATION_INTERVAL) {
        setTimeout(() => showRolling(toValue, Math.floor(Math.random() * 6) + 1, rollingEl), ANIMATION_INTERVAL);
      } else if (Date.now() < startTime + duration) {
        setTimeout(() => showRolling(toValue, finalValue, rollingEl), ANIMATION_INTERVAL);
      } else {
        setTimeout(() => {
          component.rolling = false;
          component.propagate({
            rollDuration: 0,
            rollFinalValue: finalValue,
            startRoll: false
          });
          featsContext.table.updateView();
        }, ANIMATION_INTERVAL);
      }

    }
  }
};

/* not used for the time being */
/*
const collidability = {
    install: function (component) {
        if (!component.currentCollisions) {
            component.currentCollisions = {};
        }

        featsContext.addEventListener(component, featsContext.events.onPositionChanged, (e) => {
            const collided = pickCollidedComponents();
            processAllStart(collided);
            processAllEnd(collided);

            function pickCollidedComponents() {
                const collided = [];
                for (const componentId in featsContext.table.componentsOnTable) {
                    const target = featsContext.table.componentsOnTable[componentId];
                    if (target === component) {
                        continue;
                    }
                    if (!areTheyCollidable(component, target)) {
                        continue;
                    }
                    if (isOverlapped({ top: e.top, left: e.left, height: e.height, width: e.width }, target)) {
                        collided.push(target);
                    }
                }
                return collided;
            }

            function areTheyCollidable(c1, c2) {
                if (c1.traylike && !c2.traylike) {
                    return true;
                }
                if (!c1.traylike && c2.traylike) {
                    return true;
                }
                return false;
            }

            function isOverlapped(c1, c2) {
                const rect1 = toRect(c1);
                const rect2 = toRect(c2);
                return (rect1.left <= rect2.left + rect2.width &&
                    rect2.left <= rect1.left + rect1.width &&
                    rect1.top <= rect2.top + rect2.height &&
                    rect2.top <= rect1.top + rect1.height);
            }

            function processAllStart(collided) {
                for (const other of collided) {
                    if (component.currentCollisions[other.componentId]) {
                        continue;
                    }
                    component.currentCollisions[other.componentId] = true;
                    other.currentCollisions[component.componentId] = true;

                    component.propagate({ 'currentCollisions': component.currentCollisions });
                    other.propagate({ 'currentCollisions': other.currentCollisions });
                    featsContext.fireEvent(component, collidability.events.onCollisionStart, { collider: other });
                    featsContext.fireEvent(other, collidability.events.onCollisionStart, { collider: component });
                }
            }

            function processAllEnd(collided) {
                for (const componentId in component.currentCollisions) {
                    if (collided.find(e => e.componentId === componentId)) {
                        continue;
                    }

                    delete component.currentCollisions[componentId];
                    component.propagate({ 'currentCollisions': component.currentCollisions });

                    const other = featsContext.table.componentsOnTable[componentId];
                    if (other) {
                        // there is a chance that other is already removed from table
                        delete other.currentCollisions[component.componentId];

                        other.propagate({ 'currentCollisions': other.currentCollisions });
                        featsContext.fireEvent(component, collidability.events.onCollisionEnd, { collider: other });
                        featsContext.fireEvent(other, collidability.events.onCollisionEnd, { collider: component });
                    }
                }
            }

        });
    },
    isEnabled: function (component, data) {
        return true;
    },
    onComponentUpdate: function (component, data) {
        if (data.currentCollisions) {
            component.currentCollisions = data.currentCollisions;
        }

        component.moving = data.moving;
    },
    uninstall: function (component) {
        const currentCollisions = component.currentCollisions;
        component.currentCollisions = [];  // avoid recurse
        for (const componentId in currentCollisions) {
            const other = featsContext.table.componentsOnTable[componentId];
            if (other) {
                // there is a chance that other is already removed from table
                delete other.currentCollisions[component.componentId];

                other.propagate({ 'currentCollisions': other.currentCollisions });
                featsContext.fireEvent(component, collidability.events.onCollisionEnd, { collider: other });
                featsContext.fireEvent(other, collidability.events.onCollisionEnd, { collider: component });
            }
        }
    },

    events: {
        onCollisionStart: 'collidability.onCollisionStart',
        onCollisionEnd: 'collidability.onCollisionEnd',
    },
};
*/

const within = {
  install: function(component) {
    if (!component.thingsWithinMe) {
      component.thingsWithinMe = {};
      component.iAmWithin = {};
    }

    featsContext.addEventListener(component, featsContext.events.onPositionChanged, (e) => {
      component.applyUserAction(Level.C, () => {
        dev_inspector.tracePoint('within.onPositionChanged');
        const withinCheckResult = pickCollidedComponents();
        processAllStart(withinCheckResult);
        processAllEnd(withinCheckResult);
        dev_inspector.tracePoint('finished within.onPositionChanged');
      });

      function pickCollidedComponents() {
        const thingsWithinMe = [];
        const iAmWithin = [];
        for (const componentId in featsContext.table.componentsOnTable) {
          if (!featsContext.table.componentsOnTable.hasOwnProperty(componentId)) {
            continue;
          }
          const target = featsContext.table.componentsOnTable[componentId];
          if (target === component) {
            continue;
          }

          // handAreaの時はそのまま
          if ( component.handArea ) {
            //普通のロジック
            // トレイのコンポーネントを動かしていて、範囲内に、コンポーネントが入ったら。
            if (canThisEverWithin(component, target)) {
              if (isWithin({
                  left: e.left,
                  top: e.top,
                  width: e.width,
                  height: e.height
                }, target)) {
                thingsWithinMe.push(target);
              }
            }
          } else {
            // すでにトレイの中に入っていたら、発火する。
            for (const componentIdTray in component.onTray) {
              const targetTray = featsContext.table.componentsOnTable[componentIdTray];
              if (targetTray === target) {
                // トレイのコンポーネントを動かしていて、範囲内に、コンポーネントが入ったら。
                if (canThisEverWithin(component, target)) {
                  if (isWithin({
                      left: e.left,
                      top: e.top,
                      width: e.width,
                      height: e.height
                    }, target)) {
                    thingsWithinMe.push(target);
                  }
                }
              }
            }
          }

          // 動かしているものが、ターゲットに入ったら、発火
          if (canThisEverWithin(target, component)) {
            if (isWithin(target, {
                left: e.left,
                top: e.top,
                width: e.width,
                height: e.height
              })) {
              iAmWithin.push(target);
            }
          }

        }
        return {
          thingsWithinMe: thingsWithinMe,
          iAmWithin: iAmWithin
        };
      }

      function canThisEverWithin(area, visitor) {
        return area.traylike && !visitor.traylike;
      }

      function isWithin(area, visitor) {
        const areaRect = toRect(area);
        const visitorRect = toRect(visitor);
        return (areaRect.left <= visitorRect.left &&
          visitorRect.left + visitorRect.width <= areaRect.left + areaRect.width &&
          areaRect.top <= visitorRect.top &&
          visitorRect.top + visitorRect.height <= areaRect.top + areaRect.height);
      }

      function processAllStart(withinCheckResult) {
        const thingsWithinMe = withinCheckResult.thingsWithinMe;
        const iAmWithin = withinCheckResult.iAmWithin;
        for (const other of thingsWithinMe) {
          processStartWithin(component, other);
        }

        for (const other of iAmWithin) {
          processStartWithin(other, component);
        }

        function processStartWithin(area, visitor) {
          if (area.thingsWithinMe[visitor.componentId]) {
            return;
          }
          area.thingsWithinMe[visitor.componentId] = true;
          visitor.iAmWithin[area.componentId] = true;

          area.propagate({
            'thingsWithinMe': area.thingsWithinMe
          });
          visitor.propagate({
            'iAmWithin': visitor.iAmWithin
          });
          featsContext.fireEvent(area, within.events.onWithin, {
            visitor: visitor
          });
        }
      }

      function processAllEnd(withinCheckResult) {

        for (const visitorId in component.thingsWithinMe) {
          if (withinCheckResult.thingsWithinMe.find(e => e.componentId === visitorId)) {
            continue;
          }

          delete component.thingsWithinMe[visitorId];
          component.propagate({
            'thingsWithinMe': component.thingsWithinMe
          });

          const other = featsContext.table.componentsOnTable[visitorId];
          if (other) {
            // there is a chance that other is already removed from table
            delete other.iAmWithin[component.componentId];

            other.propagate({
              'iAmWithin': other.iAmWithin
            });
            featsContext.fireEvent(component, within.events.onWithinEnd, {
              visitor: other
            });
          }
        }

        for (const otherId in component.iAmWithin) {
          if (withinCheckResult.iAmWithin.find(e => e.componentId === otherId)) {
            continue;
          }

          delete component.iAmWithin[otherId];
          component.propagate({
            'iAmWithin': component.iAmWithin
          });

          const other = featsContext.table.componentsOnTable[otherId];
          if (other) {
            // there is a chance that other is already removed from table
            delete other.thingsWithinMe[component.componentId];

            other.propagate({
              'thingsWithinMe': other.thingsWithinMe
            });
            featsContext.fireEvent(other, within.events.onWithinEnd, {
              visitor: component
            });
          }
        }

      }

    });
  },
  isEnabled: function( /*component, data*/ ) {
    return true;
  },
  receiveData: function(component, data) {
    if (data.thingsWithinMe) {
      component.thingsWithinMe = data.thingsWithinMe;
    }
    if (data.iAmWithin) {
      component.iAmWithin = data.iAmWithin;
    }

    component.moving = data.moving;
  },
  updateView: function(component, data) {

  },
  uninstall: function(component) {
    component.applyUserAction(Level.C, () => {
      const thingsWithinMe = component.thingsWithinMe;
      const iAmWithin = component.iAmWithin;
      component.thingsWithinMe = []; // avoid recurse
      component.iAmWithin = []; // avoid recurse
      for (const componentId in thingsWithinMe) {
        if (!thingsWithinMe.hasOwnProperty(componentId)) {
          continue;
        }
        const other = featsContext.table.componentsOnTable[componentId];
        if (other) {
          // there is a chance that other is already removed from table
          delete other.iAmWithin[component.componentId];

          other.propagate({
            'iAmWithin': other.iAmWithin
          });
          featsContext.fireEvent(component, within.events.onWithinEnd, {
            visitor: other
          });
        }
      }
      for (const otherId in iAmWithin) {
        if (!iAmWithin.hasOwnProperty(otherId)) {
          continue;
        }
        const other = featsContext.table.componentsOnTable[otherId];
        if (other) {
          // there is a chance that other is already removed from table
          delete other.thingsWithinMe[component.componentId];

          other.propagate({
            'thingsWithinMe': other.thingsWithinMe
          });
          featsContext.fireEvent(other, within.events.onWithinEnd, {
            visitor: component
          });
        }
      }
    });
  },

  events: {
    onWithin: 'within.onCollisionStart',
    onWithinEnd: 'within.onCollisionEnd',
  },
};

const ownership = {
  install: function(component) {
    featsContext.addEventListener(component, within.events.onWithin, (e) => {
      component.applyUserAction(Level.C, () => {
        const other = e.visitor;
        if (component.handArea && !other.handArea) {
          const hand = component;
          const onHand = other;
          if (!(onHand.owner === hand.owner)) {
            onHand.propagate({
              owner: onHand.owner = hand.owner
            });
          }
        }
      });
    });
    featsContext.addEventListener(component, within.events.onWithinEnd, (e) => {
      component.applyUserAction(Level.C, () => {
        const other = e.visitor;
        if (component.handArea && !other.handArea) {
          const hand = component;
          const onHand = other;
          if (onHand.owner === hand.owner) {
            onHand.propagate({
              owner: onHand.owner = null
            });
          }
        }
      });
    });
  },
  isEnabled: function( /*component, data*/ ) {
    return true;
  },
  receiveData(component, data) {
    if (component.owner !== data.owner) {
      console.log("ownership update change", component.componentId, component.owner, "to", data.owner);
    }
    component.owner = data.owner;
    component.handArea = data.handArea;

  },
  updateView(component, data) {
    if (component.moving) {
      return;
    }
    if (!component.handArea) {
      // 自分のトレイに入ったら
      if (component.owner) {
        setStyle(component.el, {
          boxShadow: '0 0 20px green',
        })
      } else {
        setStyle(component.el, {
          boxShadow: null,
        })
      }
    }
  },
  uninstall: function(component) {

  }
};


const handArea = {
  install: function(component, componentData) {
    if (componentData.handArea) {
      component.handArea = componentData.handArea;
      const className = component.el.getAttribute('class');
      if (!className.includes('hand_area')) {
        setAttr(component.el, 'class', className + ' hand_area');
      }
    }
  },
  isEnabled: function(component, data) {
    return data.handArea === true;
  },
  receiveData: function() {},
  updateView: function() {},
  uninstall: function() {

  }
};

const traylike = {
  // This feat is for tray-like object.  Non tray-like object can be put on tray-like objects.
  // Objects on a tray moves with the tray.
  // Hand Area is a tray-like object.  A box is another example of tray-like object.
  // Currently everything not tray-like can be put on tray-like.  Tray-like does not be put on another tray-like.
  featName: 'traylike',
  comeIn(component, event) {
    component.applyUserAction(Level.C, () => {

      component.onTray[event.visitor.componentId] = true;
      component.propagate({
        onTray: component.onTray
      });

      if (event.visitor.zIndex < component.zIndex) {
        event.visitor.propagate({
          zIndex: featsContext.table.getNextZIndex()
        });
      }
    });
  },
  install: function(component, data) {
    if (!traylike.isEnabled(component, data)) {
      // do not install
      return;
    }

    component.onTray = {};
    // ダブルクリックで移動不可(自分だけ/人が動かしたドラッグできちゃう。)
    component.el.addEventListener("dblclick", () => {
      if (component.draggable) {
        component.draggable = false;
      } else {
        component.draggable = true;
      }
      component.applyUserAction(Level.A, () => {
        component.propagate({
          draggable: component.draggable
        });
      });
    });


    featsContext.addEventListener(component, within.events.onWithin, (e) => {
      // コンポーネントがFALSEだったら処理しない。
      if (!component.traylike) { // 元
        return;
      }
      // 移動中のものがTRUEだったら処理しない。
      if (e.visitor.traylike) { // 元
        return;
      }
      traylike.comeIn(component, e);
    });

    featsContext.addEventListener(component, within.events.onWithinEnd, (e) => {
      // コンポーネントがFALSEだったら処理しない。
      if (!component.traylike) {
        return;
      }
      // 移動中のものがTRUEだったら処理しない。
      if (e.visitor.traylike) {
        return;
      }
      component.applyUserAction(Level.C, () => {
        delete component.onTray[e.visitor.componentId];
        component.propagate({
          onTray: component.onTray
        });
      });
    });

    featsContext.addEventListener(component, draggability.events.onMoving, (e) => {
      // コンポーネントがFALSEだったら処理しない。
      if (!component.traylike) {
        return;
      }
      component.applyUserAction(Level.C, () => {
        const dx = e.dx;
        const dy = e.dy;
        for (const componentId in component.onTray) {
          const target = featsContext.table.componentsOnTable[componentId];
          target.propagate_volatile({
            left: target.rect.left + dx,
            top: target.rect.top + dy,
          });
        }
      });
    });

    featsContext.addEventListener(component, draggability.events.onMoveEnd, ( /*e*/ ) => {
      // コンポーネントがFALSEだったら処理しない。
      if (!component.traylike) {
        return;
      }
      component.applyUserAction(Level.C, () => {
        for (const componentId in component.onTray) {
          const target = featsContext.table.componentsOnTable[componentId];
          target.propagate({
            left: target.rect.left,
            top: target.rect.top,
          });
        }
      });
    })
  },
  isEnabled: function(component, data) {
    return data.traylike === true;
  },
  receiveData(component, data) {
    // On or off of a tray decision is handled in tray-like object's update.
    // This is chiefly to reduce computation.  And also for simplicity.
    component.traylike = data.traylike;
    if (data.onTray) {
      component.onTray = data.onTray;
    }
  },
  updateView: function(component, data) {},
  uninstall: function(component) {

  }
};

const touchToRaise = {
  install: function(component, componentData) {
    component.el.addEventListener("mousedown", ( /*event*/ ) => {
      component.applyUserAction(Level.A, () => {
        if (featsContext.isPlayerObserver()) {
          return;
        }
        //  手前に出さない
        if (component.handArea || componentData.boxOfComponents) {
          return;
        }
        // 標準的には、Trayは手前に出さない。
        if ( component.traylike ) {
          // console.log("TestInputboard", component["name"] , componentData["name"]);
          // インプットボードの時、以外は、手前に出さない。
          if ( componentData["name"] != "InputBoardTray" ){
            return;
            // console.log("OK");
          }
        }

        // トレイの上に乗っていたら、何もしない。
        // if ( component.onTray.length != 0 ) {
        //    return;
        //}

        const nextZIndex = featsContext.table.getNextZIndexFor(componentData);
        if (nextZIndex > component.zIndex) {
          component.zIndex = nextZIndex
          setStyle(component.el, {
            zIndex: component.zIndex
          });
          component.propagate({
            zIndex: component.zIndex
          });
        }
      });
    });
  },

  isEnabled: function( /*component, data*/ ) {
    return true;
  },

  receiveData: function(component, data) {
    if (data.zIndex) {
      component.zIndex = data.zIndex;
    } else {
      component.zIndex = featsContext.table.getNextZIndex();
    }
  },
  updateView() {

  },

  uninstall: function(component) {}
};

const stowage = {
  install: function(component, componentData) {
    if (!componentData.stowage) {
      return;
    }
    featsContext.addEventListener(component, within.events.onWithin, (e) => {
      if (e.visitor.traylike) {
        return;
      }
      component.applyUserAction(Level.A, () => {
        e.visitor.propagate({
          isStowed: true
        });
      });
    });

    featsContext.addEventListener(component, within.events.onWithinEnd, (e) => {
      if (!component.traylike) {
        return;
      }
      if (e.visitor.traylike) {
        return;
      }
      component.applyUserAction(Level.A, () => {
        e.visitor.propagate({
          isStowed: false
        });
      });
    });
  },
  isEnabled: function( /*component, data*/ ) {
    // stowage feat works for both stowage traylike and stowed components
    return true;
  },

  receiveData: function(component, data) {
    if (data.isStowed === undefined) {
      return;
    }
    component.isStowed = data.isStowed;

  },
  updateView(component, data) {

    if (component.isStowed) {
      setStyle(component.el, {
        opacity: 0.4
      });
    } else {
      setStyle(component.el, {
        opacity: null
      });
    }
  },
  uninstall: function(component) {}
};

const cardistry = {
  install: function(component, data) {
    if (!data.cardistry) {
      return;
    }
    component.cardistry = {};
    setStyle(component.el, {
      'flex-flow': 'column wrap',
      'justify-content': 'left',
      'align-items': 'flex-start'
    });

    for (const cardistry of allCardistry) {
      const button = el('button', {
          'data-button-name': cardistry.name,
          onclick: () => {
            component.applyUserAction(Level.A, () => {
              cardistry.execute(component, featsContext);
            });
          },
        },
        cardistry.label,
      );
      component.el.appendChild(button);
      component.cardistry[cardistry.name] = {
        button: button,
      };
    }
  },
  isEnabled: function(component, data) {
    return data.hasOwnProperty('cardistry');
  },
  receiveData() {

  },
  updateView: function(component, componentData) {
    if (!componentData.cardistry) {
      return;
    }

    for (const cardistry of allCardistry) {
      if (componentData.cardistry.includes(cardistry.name)) {
        setStyle(component.cardistry[cardistry.name].button, {
          display: null
        });
        if (cardistry.isEnabled(component, featsContext)) {
          setAttr(component.cardistry[cardistry.name].button, 'disabled', null);
        } else {
          setAttr(component.cardistry[cardistry.name].button, 'disabled', true);
        }
        cardistry.onComponentUpdate(component, componentData);
      } else {
        setStyle(component.cardistry[cardistry.name].button, {
          display: 'none'
        });
      }
    }
  },
  uninstall: function(component) {}
};

const counter = {
  install: function(component, data) {
    if (!data.counter) {
      return;
    }

    if (!data.hasOwnProperty("counterValue")) {
      data.counterValue = 0;
    }
    const counterValue = data.counterValue;
    component.el.appendChild(
      el('div.counter', [
        el('div.labelContainer', [
          el('div.counterLabel', {}, _("Counter"))
        ]),
        el('div.valueContainer', [
          component.valueEl = el('div.counterValue', {}, counterValue)
        ]),
        el('div.buttons', [
          el('button#subTen', {
            onclick: (() => {
              count((v) => v - 10)
            })
          }, '-10'),
          el('button#subOne', {
            onclick: (() => {
              count((v) => v - 1)
            })
          }, '-1'),
          el('button#reset', {
            onclick: (() => {
              count(( /* v */ ) => 0)
            })
          }, '0'),
          el('button#addOne', {
            onclick: (() => {
              count((v) => v + 1)
            })
          }, '+1'),
          el('button#addTen', {
            onclick: (() => {
              count((v) => v + 10)
            })
          }, '+10'),
        ]),
      ])
    );

    function count(fn) {
      component.applyUserAction(Level.A, () => {
        if (!data.hasOwnProperty("counterValue")) {
          data.counterValue = 0;
        }
        const counterValue = data.counterValue;
        const newValue = fn(counterValue);
        data.counterValue = component.valueEl.innerText = newValue;
        component.propagate({
          counterValue: newValue
        });
      });
    }
  },
  isEnabled: function(component, data) {
    return data.counter === true;
  },
  receiveData() {

  },
  updateView: function(component, componentData) {
    if (!componentData.counter) {
      return;
    }

    if (componentData.hasOwnProperty("counterValue")) {
      component.valueEl.innerText = componentData.counterValue;
    }
  },
  uninstall: function(component) {}
};

const timer = {
  install: function(component, data) {
    if (!data.timer) {
      return;
    }
    var PassageID; // 秒数カウント用変数
    if (!data.hasOwnProperty("timerValue")) {
      data.timerValue = "0:00";
    }
    const timerValue = data.timerValue;
    component.el.appendChild(
      el('div.timer', [
        el('div.labelContainer', [
          el('div.timerLabel', {}, _("Timer"))
        ]),
        el('div.valueContainer', [
          component.valueEl = el('div.timerValue', {}, timerValue)
        ]),
        el('div.buttons', [
          el('button#subTen', {
            onclick: (() => {
              count((v) => v - 600)
            })
          }, '-10'),
          el('button#subOne', {
            onclick: (() => {
              count((v) => v - 60)
            })
          }, '-1'),
          el('button#reset', {
            onclick: (() => {
              count(( /* v */ ) => 0)
            })
          }, '0'),
          el('button#def', {
            onclick: (() => {
              count(( /* v */ ) => 2400)
            })
          }, '40'),
          el('button#addOne', {
            onclick: (() => {
              count((v) => v + 60)
            })
          }, '+1'),
          el('button#addTen', {
            onclick: (() => {
              count((v) => v + 600)
            })
          }, '+10'),
          el('button#addStart', {
            onclick: (() => {
              startShowing()
            })
          }, 'Start'),
          el('button#addStop', {
            onclick: (() => {
              stopShowing()
            })
          }, 'Stop'),
        ]),
      ])
    );

    // 繰り返し処理の開始
    function startShowing() {
      PassageID = setInterval(showPassage, 1000);
    }
    // 繰り返し処理の中止
    function stopShowing() {
      clearInterval(PassageID);
    }
    // 繰り返し処理の中身
    function showPassage() {

      if (!data.hasOwnProperty("timerValue")) {
        data.timerValue = 0;
      }
      var result = data.timerValue.split(':');
      var timerValue = Number(result[0]) * 60 + Number(result[1]);

      if (timerValue <= 0) {
        clearInterval(PassageID);
        alert('時間になりました。最終ターンです。');
        var newValue = '時間になりました。';
        data.timerValue = component.valueEl.innerText = newValue;
        component.propagate({
          timerValue: newValue
        });
        return;
      }
      timerValue = timerValue - 1;

      var min = timerValue % 60;
      var hour = (timerValue - min) / 60;
      var newValue = hour + ':' + zeroPadding(min, 2);
      data.timerValue = component.valueEl.innerText = newValue;
      component.propagate({
        timerValue: newValue
      });
    }

    function zeroPadding(num, length) {
      return ('0000000000' + num).slice(-length);
    }

    function count(fn) {
      // とりあえずSTOP
      clearInterval(PassageID);
      component.applyUserAction(Level.A, () => {
        if (!data.hasOwnProperty("timerValue")) {
          data.timerValue = 0;
        }
        var result = data.timerValue.split(':');
        var timerValue = Number(result[0]) * 60 + Number(result[1]);
        const newValue2 = fn(timerValue);
        var min = newValue2 % 60;
        var hour = (newValue2 - min) / 60;
        var newValue = hour + ':' + zeroPadding(min, 2);

        data.timerValue = component.valueEl.innerText = newValue;
        component.propagate({
          timerValue: newValue
        });
      });
    }
  },
  isEnabled: function(component, data) {
    return data.timer === true;
  },
  receiveData() {

  },
  updateView: function(component, componentData) {
    if (!componentData.timer) {
      return;
    }

    if (componentData.hasOwnProperty("timerValue")) {
      component.valueEl.innerText = componentData.timerValue;
    }
  },
  uninstall: function(component) {}
};


const editability = {
  install: function(component, data) {
    if (!editability.isEnabled(component, data)) {
      return;
    }

    function isEditingPermitted() {
      return component.editable && featsContext.canOperateOn(component);
    }

    component.el.addEventListener("dblclick", ( eventN ) => {


      if (!isEditingPermitted()) {
        return;
      }

      // シフト推しながらは開店
      if (eventN.shiftKey) {
          data.transData = data.transData + 1;
          if ( data.transData > 8 ){
            data.transData = 0;
          }
          component.applyUserAction(Level.A, () => {
            component.propagate({
              'transData': data.transData
            });
          });
          return;
      }

      if (data.editing) {
        return;
      }

      data.editing = true;
      let textareaEl;
      let backColorEl;
      let textColorEl;

      // TODO keep element for reuse; delete when uninstall()ed
      const formEl = el('div.note_editor', [
        textareaEl = el('textarea', {
          oninput: editing
        }, data.text),
        el('div.button_frame', [
          textColorEl = el('input', {
            'type': 'color',
            'value': data.textColor
          }),
          backColorEl = el('input', {
            'type': 'color',
            'value': data.color
          }),
          el('button', {
            onclick: endEditing
          }, _('確定'))
        ])
      ]);
      mount(component.el, formEl);

      function editing() {
        component.applyUserAction(Level.A, () => {
          component.propagate({
            'text': textareaEl.value
          });
        });
      }
      function endEditing() {
        component.applyUserAction(Level.A, () => {
          component.propagate({
            'text': textareaEl.value,
            'textColor': textColorEl.value,
            'color': backColorEl.value
          });
          unmount(component.el, formEl);
          data.editing = false;
        });
      }
    });

  },
  isEnabled: function(component, data) {
    return data.editable === true;
  },
  receiveData: function(component, data) {
    component.editable = data.editable;
  },
  updateView() {

  },
  uninstall: function(component) {},
};


const featsContext = {
  canOperateOn: function(component) {
    return ((!component.owner || component.owner === featsContext.getPlayerName()) &&
      !featsContext.isPlayerObserver());
  },
  addEventListener: function(component, eventName, handler) {
    if (!eventName) {
      throw `addEventListener: eventName must be specified but was ${eventName}`
    }
    if (!component.featEventListeners) {
      component.featEventListeners = {};
    }
    if (!component.featEventListeners[eventName]) {
      component.featEventListeners[eventName] = [];
    }
    component.featEventListeners[eventName].push({
      component: component,
      handler: handler
    });
  },
  fireEvent: function(component, eventName, event) {
    if (!eventName) {
      throw `fireEvent: eventName must be specified but was ${eventName}`
    }
    if (!component.featEventListeners[eventName]) {
      return;
    }
    for (const entry of component.featEventListeners[eventName]) {
      if (entry.component === component) {
        entry.handler(event);
      }
    }
  },
  events: {
    /*
    This event is fired when position or size of component is changed.
    Event must have these parameters.
        top:
        left:
        height:
        width:
        moving: true if in transition (being dragged)
     */
    onPositionChanged: 'onPositionChanged',
  }
};

function setFeatsContext(getPlayerName, isPlayerObserver, table) {
  featsContext.getPlayerName = getPlayerName;
  featsContext.isPlayerObserver = isPlayerObserver;
  featsContext.table = table;
}

const event = {
  events: featsContext.events,
  fireEvent: function(component, eventName, event) {
    featsContext.fireEvent(component, eventName, event);
  }
};

const feats = [
  basic, // this must be the first ability in feats
  within,
  draggability,
  flippability,
  resizability,
  rollability,
  traylike,
  handArea,
  ownership,
  touchToRaise,
  stowage,
  cardistry,
  counter,
  timer,
  editability
];

// dynamic validation
// It also helps removing some of 'unused property' warning but not all.
for (const feat of feats) {
  console.assert(feat.install !== undefined);
  console.assert(feat.isEnabled !== undefined);
  console.assert(feat.receiveData !== undefined && feat.updateView !== undefined);
  console.assert(feat.uninstall !== undefined);
}

export {
  setFeatsContext,
  feats,
  event,

  // exported for testing only (probably)
  basic,
  within,
  draggability,
  flippability,
  resizability,
  rollability,
  traylike,
  handArea,
  ownership,
  touchToRaise,
  stowage,
  cardistry,
  counter,
  timer,
  editability
};
