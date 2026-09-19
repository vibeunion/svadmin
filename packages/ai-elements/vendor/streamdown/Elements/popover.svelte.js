import { useClickOutside } from '../utils/useClickOutside.svelte.js';
import { autoPlacement, computePosition, autoUpdate, hide, offset, shift } from '@floating-ui/dom';
import { setContext } from 'svelte';
export class Popover {
    isOpen = $state(false);
    content = $state();
    reference = $state();
    constructor() {
        setContext('POPOVER', true);
    }
    place = async (node) => {
        const middleware = [
            hide(),
            offset(10),
            shift({
                mainAxis: true
            }),
            autoPlacement({
                allowedPlacements: ['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start']
            })
        ];
        const { x, y, strategy, placement, middlewareData } = await computePosition(this.reference, node, {
            strategy: 'fixed',
            middleware
        });
        Object.assign(node.style, {
            position: strategy,
            left: `${x}px`,
            top: `${y}px`
        });
    };
    popoverAttachment = (node) => {
        this.content = node;
        const target = node.ownerDocument.body;
        if (node.parentElement !== target) {
            target.appendChild(node);
        }
        void this.place(node);
        const off = autoUpdate(this.reference, node, () => this.place(node));
        return () => {
            off();
            node.remove();
        };
    };
}
