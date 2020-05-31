import {el, mount, unmount, setAttr, setStyle} from "./redom.es.js";

// import interact from './interact.js'

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function toRect(c) {
    if (c.top && c.left && c.width && c.height) {
        return {
            top: parseFloat(c.top),
            left: parseFloat(c.left),
            height: parseFloat(c.height),
            width: parseFloat(c.width),
        }
    }
    if (c.el) {
        return {
            top: parseFloat(c.el.style.top),
            left: parseFloat(c.el.style.left),
            height: parseFloat(c.el.style.height),
            width: parseFloat(c.el.style.width),
        }
    }
    throw 'Cannot detect rect';
}

function isOverlapped(c1, c2) {
    const rect1 = toRect(c1);
    const rect2 = toRect(c2);
    return (rect1.left <= rect2.left + rect2.width &&
        rect2.left <= rect1.left + rect1.width &&
        rect1.top <= rect2.top + rect2.height &&
        rect2.top <= rect1.top + rect1.height);
}

const draggability = {
    add: function (component) {
        function isDraggingPermitted() {
            return component.draggable && featsContext.canOperateOn(component);
        }

        interact(component.el).draggable({
            listeners: {
                move(event) {
                    if (!isDraggingPermitted()) {
                        return;
                    }
                    component.moving = true;
                    const top = parseFloat(component.el.style.top) + event.dy;
                    const left = parseFloat(component.el.style.left) + event.dx;
                    component.propagate_volatile({ top: top + "px", left: left + "px", moving: true });
                    featsContext.fireEvent(component, draggability.events.onMoving, { dx: event.dx, dy: event.dy });
                },
                end(event) {
                    if (!isDraggingPermitted()) {
                        return;
                    }
                    component.moving = false;
                    const top = parseFloat(component.el.style.top) + event.dy;
                    const left = parseFloat(component.el.style.left) + event.dx;
                    const diff = { top: top + "px", left: left + "px", moving: false };

                    component.propagate(diff);
                    featsContext.fireEvent(component, featsContext.events.onPositionChanged, {});
                    featsContext.fireEvent(component, featsContext.events.onMoveEnd, {});
                }
            }
        });


    },
    isEnabled: function (component, data) {
        return data.draggable === true;
    },
    update: function (component, data) {
        component.draggable = data.draggable;
        component.owner = data.owner;
        component.ownable = data.ownable;
    },
    events: {
        onMoving: "draggability.onMoving",
        onMoveEnd: "draggability.onMoveEnd",
    }
};

const flippability = {
    add: function (component) {
        function isFlippingPermitted() {
            return component.flippable && featsContext.canOperateOn(component);
        }

        component.el.addEventListener("dblclick", () => {
            if (!isFlippingPermitted()) {
                return;
            }
            let diff = {};
            if (component.owner && component.owner !== featsContext.playerName) {
                return;
            }
            if (component.faceup) {
                diff.faceup = component.faceup = false;
            } else {
                diff.faceup = component.faceup = true;
            }
            component.propagate(diff);
        });
    },
    isEnabled: function (component, data) {
        return data.flippable === true;
    },
    update: function (component, data) {
        component.flippable = data.flippable;
        component.faceup = data.faceup;
        if (component.faceup) {
            if (!component.owner || component.owner === featsContext.playerName) {
                if (data.showImage) {
                    setAttr(component.image, { src: data.faceupImage });
                }
                if (data.faceupText) {
                    component.textEl.innerText = data.faceupText;
                } else {
                    component.textEl.innerText = '';
                }
            } else {
                if (data.showImage) {
                    setAttr(component.image, { src: data.facedownImage });
                }
                if (data.facedownText) {
                    component.textEl.innerText = data.facedownText;
                } else {
                    component.textEl.innerText = '';
                }
            }
        } else {
            if (data.showImage) {
                setAttr(component.image, { src: data.facedownImage });
            }
            if (data.faceupText) {
                component.textEl.innerText = data.facedownText;
            } else {
                component.textEl.innerText = '';
            }
        }
        component.faceup = data.faceup;

    },
};


const resizability = {
    add: function (component) {
        function isResizingPermitted() {
            return component.resizable && featsContext.canOperateOn(component);
        }

        interact(component.el).resizable({
            edges: {
                top: true,
                left: true,
                bottom: true,
                right: true,
            },
            invert: 'reposition',

            onmove: (event) => {
                if (!isResizingPermitted()) {
                    return;
                }
                let top = parseFloat(component.el.style.top) + event.deltaRect.top;
                let left = parseFloat(component.el.style.left) + event.deltaRect.left;
                let width = parseFloat(component.el.style.width) + event.deltaRect.width;
                let height = parseFloat(component.el.style.height) + event.deltaRect.height;
                component.propagate_volatile({ top: top, left: left, width: width, height: height });
            },
            onend: (event) => {
                if (!isResizingPermitted()) {
                    return;
                }
                // resizeend event have wrong value in deltaRect so just ignore it
                let top = parseFloat(component.el.style.top);
                let left = parseFloat(component.el.style.left);
                let width = parseFloat(component.el.style.width);
                let height = parseFloat(component.el.style.height);
                component.propagate({ top: top, left: left, width: width, height: height });
                featsContext.fireEvent(component, featsContext.events.onPositionChanged, {});
            },
        })
    },
    isEnabled: function (component, data) {
        return data.resizable === true;
    },
    update: function (component, data) {
        component.resizable = data.resizable;
    },
};

const rollability = {
    add: function (component) {
        function isRollingPermitted() {
            return component.rollable && featsContext.canOperateOn(component);
        }

        component.el.addEventListener("dblclick", startRoll);

        function startRoll(event) {
            if (!isRollingPermitted()) {
                return;
            }
            if (component.rolling) {
                return false;
            }
            const duration = Math.random() * 1000 + 500;
            const finalValue = Math.floor(Math.random() * 6) + 1;
            component.rolling = true;
            component.propagate({ rollDuration: duration, rollFinalValue: finalValue, startRoll: true });
            return false;
        }
    },
    isEnabled: function (component, data) {
        return data.rollable === true;
    },
    update: function (component, data) {
        component.rollable = data.rollable;

        if (data.startRoll) {
            data.startRoll = undefined;
            component.rolling = true;
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
            const finalEl = el("div.dice_image", { style: { width: "100%", height: "100%" } });
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
    roll: function (component, duration, finalValue) {
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
            const rollingEl = el("div.dice_image", { style: { width: "100%", height: "100%" } });
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
                    component.propagate({ rollDuration: 0, rollFinalValue: finalValue, startRoll: false });
                }, ANIMATION_INTERVAL);
            }

        }
    }
};


const collidability = {
    add: function (component) {
        if (!featsContext.collisionComponents) {
            featsContext.collisionComponents = {};
        }
        if (!component.currentCollisions) {
            component.currentCollisions = {};
        }

        featsContext.addEventListener(component, featsContext.events.onPositionChanged, (e) => {
            const collided = [];
            for (const index in featsContext.collisionComponents) {
                const target = featsContext.collisionComponents[index];
                if (target === component) {
                    continue;
                }
                if (isOverlapped(component, target)) {
                    collided.push(target);
                }
            }

            for (const other of collided) {
                if (component.currentCollisions[other.index]) {
                    continue;
                }
                component.currentCollisions[other.index] = true;
                other.currentCollisions[component.index] = true;

                component.propagate({ 'currentCollisions': component.currentCollisions });
                other.propagate({ 'currentCollisions': other.currentCollisions });
                featsContext.fireEvent(component, collidability.events.onCollisionStart, { collider: other });
                featsContext.fireEvent(other, collidability.events.onCollisionStart, { collider: component });
            }
            for (const index in component.currentCollisions) {
                if (collided.find(e => e.index === parseInt(index))) {
                    continue;
                }

                const other = featsContext.collisionComponents[index];
                delete component.currentCollisions[other.index];
                delete other.currentCollisions[component.index];

                component.propagate({ 'currentCollisions': component.currentCollisions });
                other.propagate({ 'currentCollisions': other.currentCollisions });
                featsContext.fireEvent(component, collidability.events.onCollisionEnd, { collider: other });
                featsContext.fireEvent(other, collidability.events.onCollisionEnd, { collider: component });
            }
        });
    },
    isEnabled: function (component, data) {
        return true;
    },
    update: function (component, data) {
        if (!featsContext.collisionComponents[component.index]) {
            featsContext.collisionComponents[component.index] = component;
        }
        if (data.currentCollisions) {
            component.currentCollisions = data.currentCollisions;
        }

        component.moving = data.moving;
    },
    events: {
        onCollisionStart: 'collidability.onCollisionStart',
        onCollisionEnd: 'collidability.onCollisionEnd',
    },
    recalculate: function (tableData) {
        featsContext.collisionComponents = {};
        for(const component of tableData.components) {
            featsContext.collisionComponents[component.index] = component;
            component.currentCollisions = {};
        }

        for (const i in featsContext.collisionComponents) {
            const component = featsContext.collisionComponents[i];

            for (const j in featsContext.collisionComponents) {
                const target = featsContext.collisionComponents[j];
                if (i === j) {
                    continue;
                }
                if (isOverlapped(component, target)) {
                    component.currentCollisions[j] = true;
                }
            }
        }
    },
};

const ownership = {
    add: function (component) {
        featsContext.addEventListener(component, collidability.events.onCollisionStart, (e) => {
            const other = e.collider;
            if (component.handArea && !other.handArea) {
                const hand = component;
                const onHand = other;
                if (!(onHand.owner === hand.owner)) {
                    onHand.propagate({ owner: onHand.owner = hand.owner });
                }
            }
        });
        featsContext.addEventListener(component, collidability.events.onCollisionEnd, (e) => {
            const other = e.collider;
            if (component.handArea && !other.handArea) {
                const hand = component;
                const onHand = other;
                if (onHand.owner === hand.owner) {
                    onHand.propagate({ owner: onHand.owner = null });
                }
            }
        });
    },
    isEnabled: function (component, data) {
        return true;
    },
    update: function (component, data) {
        component.owner = data.owner;
        component.handArea = data.handArea;
        if (component.moving) {
            return;
        }
        if (!component.handArea) {
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
};


const traylike = {
    // This feat is for tray-like object.  Non tray-like object can be put on tray-like objects.
    // Objects on a tray moves with the tray.
    // Hand Area is a tray-like object.  A box is another example of tray-like object.
    // Currently everything not tray-like can be put on tray-like.  Tray-like does not be put on another tray-like.
    add: function (component) {
        component.onTray = {};

        featsContext.addEventListener(component, collidability.events.onCollisionStart, (e) => {
            if (!component.traylike) {
                return;
            }
            if (e.collider.traylike) {
                return;
            }
            component.onTray[e.collider.index] = true;
            component.propagate({ onTray: component.onTray });
        });

        featsContext.addEventListener(component, collidability.events.onCollisionEnd, (e) => {
            if (!component.traylike) {
                return;
            }
            if (e.collider.traylike) {
                return;
            }
            delete component.onTray[e.collider.index];
            component.propagate({ onTray: component.onTray });
        });

        featsContext.addEventListener(component, draggability.events.onMoving, (e) => {
            if (!component.traylike) {
                return;
            }
            const dx = e.dx;
            const dy = e.dy;
            for (const idx in component.onTray) {
                const target = featsContext.collisionComponents[idx];
                target.propagate_volatile({
                    top: parseFloat(target.el.style.top) + dy,
                    left: parseFloat(target.el.style.left) + dx
                });
            }
        })

        featsContext.addEventListener(component, draggability.events.onMoveEnd, (e) => {
            if (!component.traylike) {
                return;
            }
            for (const idx in component.onTray) {
                const target = featsContext.collisionComponents[idx];
                target.propagate({
                    top: target.el.style.top,
                    left: target.el.style.left
                });
            }
        })
    },
    isEnabled: function (component, data) {
        return data.traylike === true;
    },
    update: function (component, data) {
        // On or off of a tray decision is handled in tray-like object's update.
        // This is chiefly to reduce computation.  And also for simplicity.
        component.traylike = data.traylike;
        if (data.onTray) {
            component.onTray = data.onTray;
        }
    },
};


const featsContext = {
    canOperateOn: function (component) {
        return ((!component.owner || component.owner === featsContext.playerName)
            && !featsContext.isPlayerObserver);
    },
    addEventListener: function (component, eventName, handler) {
        if (!featsContext.eventListeners[eventName]) {
            featsContext.eventListeners[eventName] = [];
        }
        featsContext.eventListeners[eventName].push({ component: component, handler: handler });
    },
    fireEvent: function (component, eventName, event) {
        if (!featsContext.eventListeners[eventName]) {
            return;
        }
        for (const entry of featsContext.eventListeners[eventName]) {
            if (entry.component === component) {
                entry.handler(event);
            }
        }
    },
    eventListeners: {},
    events: {
        onPositionChanged: 'onPositionChanged',
    }
};

function setFeatsContext(playerName, isPlayerObserver, tableData) {
    featsContext.playerName = playerName;
    featsContext.isPlayerObserver = isPlayerObserver;
    featsContext.tableData = tableData;
}

const feats = [
    collidability, draggability, flippability, resizability, rollability, traylike, ownership,
];

export {setFeatsContext, feats};