import { onDestroy, untrack } from 'svelte';
export const usePanzoom = (opts = {}) => {
    // state
    let x = opts.initialX ?? 0;
    let y = opts.initialY ?? 0;
    let scale = opts.initialScale ?? 1;
    // options
    const minZoom = opts.minZoom ?? 0.1;
    const maxZoom = opts.maxZoom ?? Number.POSITIVE_INFINITY;
    const zoomSpeed = opts.zoomSpeed ?? 1;
    const doubleClickScale = opts.doubleClickScale ?? 1.75;
    const resolveFlag = (value, fallback) => (typeof value === 'function' ? value() : value) ?? fallback;
    const isEnabled = () => resolveFlag(opts.enabled, true);
    const isMouseWheelEnabled = () => resolveFlag(opts.activateMouseWheel, false);
    let node = $state(null); // element we transform
    let eventTarget = $state(null); // element we listen on (parent container if available)
    let createdWrapper = null; // wrapper we created if no parent existed
    const listeners = new Set();
    // drag state
    let dragging = false;
    let lastClientX = 0;
    let lastClientY = 0;
    let dragOffMove = null;
    let dragOffUp = null;
    let previousStyle = null;
    // touch state
    let touchMode = 'none';
    let pinchDistance = 0;
    let pinchCenter = null;
    // expand/collapse state
    let isExpanded = $state(false);
    let animating = false;
    let placeholderEl = null;
    function onKeyDown(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            if (isExpanded && !animating) {
                // fire and forget
                void expand(false);
            }
        }
    }
    const destroy = () => {
        listeners.forEach((off) => off());
        listeners.clear();
        if (placeholderEl) {
            placeholderEl.remove();
            placeholderEl = null;
        }
        if (createdWrapper) {
            // Move node back out of wrapper before removing wrapper
            if (node && createdWrapper.parentElement) {
                createdWrapper.parentElement.insertBefore(node, createdWrapper);
            }
            createdWrapper.remove();
            createdWrapper = null;
        }
        if (dragOffMove)
            dragOffMove();
        if (dragOffUp)
            dragOffUp();
    };
    onDestroy(() => {
        destroy();
    });
    $effect(() => {
        const enabled = isEnabled();
        const currentNode = node;
        const interactionTarget = (eventTarget ?? currentNode);
        if (!interactionTarget && !currentNode) {
            return;
        }
        if (interactionTarget) {
            interactionTarget.style.userSelect = enabled ? 'none' : '';
            interactionTarget.style.touchAction = enabled ? 'none' : '';
            interactionTarget.style.cursor = enabled ? 'grab' : '';
            interactionTarget.style.overscrollBehavior = enabled ? 'contain' : '';
        }
        if (!enabled && currentNode) {
            currentNode.style.cursor = '';
        }
        return () => {
            if (interactionTarget) {
                interactionTarget.style.userSelect = '';
                interactionTarget.style.touchAction = '';
                interactionTarget.style.cursor = '';
                interactionTarget.style.overscrollBehavior = '';
            }
            if (currentNode) {
                currentNode.style.cursor = '';
            }
        };
    });
    function normalize() {
        // clamp and round to reduce subpixel jitter
        scale = clampScale(scale);
        const r = (v) => Math.round(v * 1000) / 1000;
        x = r(x);
        y = r(y);
        scale = r(scale);
    }
    function apply() {
        if (!node)
            return;
        normalize();
        // Use CSS transform regardless of DOM/SVG root; modern browsers support this.
        const el = node;
        el.style.transformOrigin = '0 0';
        el.style.willChange = 'transform';
        // transform order is right-to-left. We want screen = translate + scale * local
        // so use translate() first, then scale().
        el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    }
    function clampScale(s) {
        if (s < minZoom)
            return minZoom;
        if (s > maxZoom)
            return maxZoom;
        return s;
    }
    function zoomAt(clientX, clientY, factor) {
        if (!node)
            return;
        if (!Number.isFinite(factor) || factor === 1)
            return;
        const nextScale = clampScale(scale * factor);
        const ratio = nextScale / scale;
        if (ratio === 1)
            return;
        const owner = (eventTarget ?? node.parentElement ?? node);
        const ownerRect = owner.getBoundingClientRect();
        const ox = clientX - ownerRect.left;
        const oy = clientY - ownerRect.top;
        // Keep (ox, oy) stationary in owner's coordinate space
        x = ratio * x + (1 - ratio) * ox;
        y = ratio * y + (1 - ratio) * oy;
        scale = nextScale;
        apply();
    }
    function kineticWheel(deltaY) {
        // deltaY > 0 => zoom out; use smooth exponential scaling
        const sign = Math.sign(deltaY);
        const step = Math.min(0.25, Math.abs((zoomSpeed * deltaY) / 128));
        return 1 - sign * step;
    }
    function onWheel(e) {
        if (!isEnabled())
            return;
        if (!isMouseWheelEnabled())
            return;
        if (!node)
            return;
        if (animating) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        // Always prevent default to stop page scroll
        e.preventDefault();
        e.stopPropagation();
        const factor = kineticWheel(e.deltaY * (e.deltaMode ? 100 : 1));
        zoomAt(e.clientX, e.clientY, factor);
        // re-apply using latest rect
        apply();
    }
    function onDblClick(e) {
        if (!isEnabled())
            return;
        // Ignore dblclicks that originate outside of the pan/zoom content (the node)
        const t = e.target;
        if (node && t && !(t === node || node.contains(t))) {
            return; // likely UI control inside container; don't zoom
        }
        // Ignore dblclicks on interactive elements or those explicitly marked to ignore
        const isInteractive = (el) => {
            const tag = el.tagName.toLowerCase();
            return (el.closest('[data-panzoom-ignore]') !== null ||
                ['button', 'a', 'input', 'textarea', 'select', 'label', 'summary', 'details'].includes(tag) ||
                el.isContentEditable);
        };
        if (t && isInteractive(t))
            return;
        e.preventDefault();
        // Anchor double-click zoom at parent center to avoid shifts on rapid clicks
        const baseEl = (eventTarget ?? node?.parentElement ?? node);
        const base = baseEl.getBoundingClientRect();
        const cx = base.left + base.width / 2;
        const cy = base.top + base.height / 2;
        zoomAt(cx, cy, doubleClickScale);
    }
    function startDrag(e) {
        if (!isEnabled())
            return;
        if (animating) {
            e.preventDefault();
            return;
        }
        if (e.button !== 0)
            return; // left only
        dragging = true;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        e.preventDefault();
        if (node)
            node.style.cursor = 'grabbing';
        dragOffMove = () => window.removeEventListener('mousemove', onDragMove);
        dragOffUp = () => window.removeEventListener('mouseup', endDrag);
        window.addEventListener('mousemove', onDragMove, { passive: false });
        window.addEventListener('mouseup', endDrag, { passive: true });
        listeners.add(dragOffMove);
        listeners.add(dragOffUp);
    }
    function onDragMove(e) {
        if (!dragging)
            return;
        const dx = e.clientX - lastClientX;
        const dy = e.clientY - lastClientY;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        x += dx;
        y += dy;
        apply();
    }
    function endDrag() {
        dragging = false;
        if (node)
            node.style.cursor = 'grab';
        if (dragOffMove) {
            dragOffMove();
            listeners.delete(dragOffMove);
        }
        if (dragOffUp) {
            dragOffUp();
            listeners.delete(dragOffUp);
        }
        dragOffMove = dragOffUp = null;
    }
    function onTouchStart(e) {
        if (!isEnabled())
            return;
        const hasButton = e
            .composedPath()
            .some((el) => el.tagName?.toLowerCase?.() === 'button');
        if (hasButton)
            return;
        if (!node)
            return;
        if (animating) {
            e.preventDefault();
            return;
        }
        if (e.touches.length === 1) {
            touchMode = 'pan';
            lastClientX = e.touches[0].clientX;
            lastClientY = e.touches[0].clientY;
        }
        else if (e.touches.length >= 2) {
            touchMode = 'pinch';
            const [t1, t2] = [e.touches[0], e.touches[1]];
            pinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            pinchCenter = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            };
        }
        // prevent default scrolling/zooming
        e.preventDefault();
        const offMove = () => window.removeEventListener('touchmove', onTouchMove);
        const offEnd = () => window.removeEventListener('touchend', onTouchEnd);
        const offCancel = () => window.removeEventListener('touchcancel', onTouchEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });
        listeners.add(offMove);
        listeners.add(offEnd);
        listeners.add(offCancel);
    }
    function onTouchMove(e) {
        if (!node)
            return;
        if (touchMode === 'pan' && e.touches.length === 1) {
            const t = e.touches[0];
            const dx = t.clientX - lastClientX;
            const dy = t.clientY - lastClientY;
            lastClientX = t.clientX;
            lastClientY = t.clientY;
            x += dx;
            y += dy;
            apply();
            e.preventDefault();
        }
        else if (touchMode === 'pinch' && e.touches.length >= 2) {
            const [t1, t2] = [e.touches[0], e.touches[1]];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const factor = dist / (pinchDistance || dist);
            const center = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            };
            zoomAt(center.x, center.y, factor);
            pinchDistance = dist;
            pinchCenter = center;
            e.preventDefault();
        }
    }
    function onTouchEnd() {
        if (!node)
            return;
        if (touchMode === 'pinch') {
            // reset pinch state, keep resulting transform
            touchMode = 'none';
            pinchDistance = 0;
            pinchCenter = null;
        }
        else if (touchMode === 'pan') {
            touchMode = 'none';
        }
    }
    function internalAttach(target) {
        return untrack(() => {
            node = target;
            // Ensure eventTarget and node are different elements to avoid FLIP conflicts
            const isSVG = typeof SVGSVGElement !== 'undefined' && target instanceof SVGSVGElement;
            if (isSVG) {
                // For SVG, prefer parent element
                eventTarget = target.parentElement;
            }
            else {
                // For non-SVG, try to use parent element when available
                const parent = target.parentElement;
                if (parent && parent instanceof HTMLElement) {
                    eventTarget = parent;
                }
                else {
                    // No suitable parent - create wrapper to ensure separation
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = `
						display: contents;
						contain: layout style;
					`
                        .replace(/\s+/g, ' ')
                        .trim();
                    // Insert wrapper and move target into it
                    if (target.parentElement) {
                        target.parentElement.insertBefore(wrapper, target);
                    }
                    wrapper.appendChild(target);
                    eventTarget = wrapper;
                    createdWrapper = wrapper;
                }
            }
            // Final fallback if no eventTarget was established
            if (!eventTarget) {
                eventTarget = target;
            }
            apply();
            // helper to add and track listeners with options
            const add = (type, handler, options) => {
                const n = (eventTarget ?? node);
                n.addEventListener(type, handler, options);
                const off = () => n.removeEventListener(type, handler, options);
                listeners.add(off);
                return off;
            };
            const addWindow = (type, handler, options) => {
                window.addEventListener(type, handler, options);
                const off = () => window.removeEventListener(type, handler, options);
                listeners.add(off);
                return off;
            };
            // core events with passive: false where needed
            add('mousedown', startDrag, { passive: false });
            add('wheel', onWheel, { passive: false, capture: true });
            add('dblclick', onDblClick, { passive: false });
            add('touchstart', onTouchStart, { passive: false });
            addWindow('keydown', onKeyDown, { passive: true });
            // For SVG root, use fill-box so translation math stays in CSS px space
            const n = node;
            if (typeof SVGSVGElement !== 'undefined' && target instanceof SVGSVGElement) {
                n.style.transformBox = 'fill-box';
            }
            return () => {
                destroy();
            };
        });
    }
    const expand = (expand) => {
        if (!eventTarget)
            return;
        // Capture first state
        const first = eventTarget.getBoundingClientRect();
        if (expand) {
            // Expanding: immediately apply expanded state
            // We should add margin to the parent element to account for the expanded height
            if (eventTarget.parentElement) {
                const styleAttributes = ['margin-block', 'height'];
                styleAttributes.forEach((attribute) => {
                    if (eventTarget?.parentElement) {
                        eventTarget.parentElement.style.setProperty(attribute, getComputedStyle(eventTarget).getPropertyValue(attribute));
                    }
                });
            }
            eventTarget.dataset.expanded = 'true';
            isExpanded = true;
            zoomToFit();
            // Force layout to get the final position
            const last = eventTarget.getBoundingClientRect();
            // Calculate the inverse transform
            const deltaX = first.left - last.left;
            const deltaY = first.top - last.top;
            const deltaW = first.width / last.width;
            const deltaH = first.height / last.height;
            // Animate from original position to expanded
            const animation = eventTarget.animate([
                {
                    transformOrigin: '0 0',
                    transform: `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`
                },
                {
                    transformOrigin: '0 0',
                    transform: 'translate(0px, 0px) scale(1, 1)'
                }
            ], {
                duration: 350,
                easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
                fill: 'both'
            });
            animation.finished.then(() => {
                animation.cancel();
            });
        }
        else {
            // Collapsing: keep expanded state during animation, then remove
            const last = {
                left: first.left,
                top: first.top,
                width: first.width,
                height: first.height
            };
            // Calculate where it will be after collapsing
            eventTarget.dataset.expanded = 'false';
            const final = eventTarget.getBoundingClientRect();
            // Restore expanded state for animation
            eventTarget.dataset.expanded = 'true';
            const deltaX = final.left - last.left;
            const deltaY = final.top - last.top;
            const deltaW = final.width / last.width;
            const deltaH = final.height / last.height;
            // Animate from expanded to collapsed
            const animation = eventTarget.animate([
                {
                    transformOrigin: '0 0',
                    transform: 'translate(0px, 0px) scale(1, 1)'
                },
                {
                    transformOrigin: '0 0',
                    transform: `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`
                }
            ], {
                duration: 350,
                easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
                fill: 'both'
            });
            animation.finished.then(() => {
                animation.cancel();
                // Only remove expanded state after animation completes
                if (!eventTarget)
                    return;
                eventTarget.dataset.expanded = 'false';
                eventTarget.parentElement.style.height = 'fit-content';
                isExpanded = false;
                zoomToFit();
            });
        }
    };
    async function toggleExpand() {
        if (isExpanded)
            return expand(false);
        return expand(true);
    }
    function zoomToFit(padding = 0.05) {
        if (!node)
            return;
        const parent = node.parentElement;
        if (!parent)
            return;
        const parentRect = parent.getBoundingClientRect();
        const rect = node.getBoundingClientRect();
        // infer unscaled natural size by dividing by current scale
        const naturalWidth = rect.width / scale || 0;
        const naturalHeight = rect.height / scale || 0;
        const targetWidth = parentRect.width * (1 - 2 * padding);
        const targetHeight = parentRect.height * (1 - 2 * padding);
        if (naturalWidth <= 0 || naturalHeight <= 0 || targetWidth <= 0 || targetHeight <= 0)
            return;
        const s = clampScale(Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight));
        // Temporarily apply scale with zero translate to measure new size
        scale = s;
        x = 0;
        y = 0;
        apply();
        const newRect = node.getBoundingClientRect();
        // compute centered position inside parent
        const targetLeft = parentRect.left + (parentRect.width - newRect.width) / 2;
        const targetTop = parentRect.top + (parentRect.height - newRect.height) / 2;
        x = targetLeft - newRect.left;
        y = targetTop - newRect.top;
        apply();
    }
    function zoomBy(factor) {
        if (!node)
            return;
        // Use zoomAt with the center of the container for consistent behavior
        const owner = (eventTarget ?? node.parentElement ?? node);
        const ownerRect = owner.getBoundingClientRect();
        const cx = ownerRect.left + ownerRect.width / 2;
        const cy = ownerRect.top + ownerRect.height / 2;
        zoomAt(cx, cy, factor);
    }
    function moveBy(dx, dy) {
        x += dx;
        y += dy;
        apply();
    }
    function zoomIn(factor = 1.25) {
        zoomBy(factor);
    }
    function zoomOut(factor = 1.25) {
        // zoom out by inverse multiplier
        if (factor <= 0)
            return;
        zoomBy(1 / factor);
    }
    function setTransform(nx, ny, ns) {
        scale = clampScale(ns);
        x = nx;
        y = ny;
        apply();
    }
    return {
        attach: internalAttach,
        zoomToFit,
        zoomBy,
        zoomIn,
        zoomOut,
        moveBy,
        setTransform,
        expand,
        toggleExpand,
        get transform() {
            return { x, y, scale };
        },
        get expanded() {
            return isExpanded;
        }
    };
};
