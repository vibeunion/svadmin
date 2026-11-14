import { createContext } from 'svelte';
import { Tooltip as TooltipPrimitive } from 'bits-ui';

type TriggerReader = () => HTMLElement | null;
type ContentIdReader = () => string;
type TooltipTether = TooltipPrimitive.Tether<unknown>;
type PresenceStatus = 'starting' | 'ending' | undefined;

export class TooltipLayerContext {
	#readOpen: () => boolean;
	#writeOpen: (open: boolean) => void;
	#readDisableHoverableContent: () => boolean;
	#readActiveTriggerId: () => string | null;
	#readExternalTrigger: (triggerId: string) => HTMLElement | null;
	#readOnOpenChangeComplete: () => ((open: boolean) => void) | undefined;
	#triggers = new Map<string, TriggerReader>();
	#readContentId: ContentIdReader;
	#contentNode: HTMLElement | null = null;
	#closeTimer: ReturnType<typeof setTimeout> | undefined;
	#transitionFrame: number | null = null;
	#transitionGeneration = 0;
	#destroyed = false;
	shouldRender = $state(false);
	presenceStatus = $state<PresenceStatus>(undefined);

	constructor(
		readonly defaultContentId: string,
		readOpen: () => boolean,
		writeOpen: (open: boolean) => void,
		readDisableHoverableContent: () => boolean,
		readActiveTriggerId: () => string | null,
		readExternalTrigger: (triggerId: string) => HTMLElement | null = () => null,
		readOnOpenChangeComplete: () => ((open: boolean) => void) | undefined = () => undefined
	) {
		this.#readOpen = readOpen;
		this.#writeOpen = writeOpen;
		this.#readDisableHoverableContent = readDisableHoverableContent;
		this.#readActiveTriggerId = readActiveTriggerId;
		this.#readExternalTrigger = readExternalTrigger;
		this.#readOnOpenChangeComplete = readOnOpenChangeComplete;
		this.#readContentId = () => defaultContentId;
		this.shouldRender = readOpen();
	}

	get open() {
		return this.#readOpen();
	}

	get trigger() {
		const activeTriggerId = this.activeTriggerId;
		if (!activeTriggerId) return null;
		return this.#triggers.get(activeTriggerId)?.() ?? this.#readExternalTrigger(activeTriggerId);
	}

	get activeTriggerId() {
		return this.#readActiveTriggerId();
	}

	get contentId() {
		return this.#readContentId();
	}

	get disableHoverableContent() {
		return this.#readDisableHoverableContent();
	}

	close() {
		if (this.#destroyed) return;
		this.cancelScheduledClose();
		this.#writeOpen(false);
	}

	scheduleClose(delay = 0) {
		if (this.#destroyed) return;
		this.cancelScheduledClose();
		this.#closeTimer = setTimeout(() => {
			this.#closeTimer = undefined;
			if (!this.#destroyed) this.#writeOpen(false);
		}, delay);
	}

	cancelScheduledClose() {
		if (this.#closeTimer === undefined) return;
		clearTimeout(this.#closeTimer);
		this.#closeTimer = undefined;
	}

	destroy() {
		this.#destroyed = true;
		this.cancelScheduledClose();
		this.#cancelTransitionFrame();
		this.#transitionGeneration += 1;
		this.#triggers.clear();
		this.#contentNode = null;
		this.#readExternalTrigger = () => null;
		this.#readOnOpenChangeComplete = () => undefined;
		this.#readContentId = () => this.defaultContentId;
	}

	setContentNode(node: HTMLElement | null) {
		this.#contentNode = node;
	}

	transitionPresence(open: boolean) {
		if (this.#destroyed) return;
		const generation = ++this.#transitionGeneration;
		this.#cancelTransitionFrame();
		if (open) this.shouldRender = true;
		this.presenceStatus = open ? 'starting' : 'ending';

		const readAnimations = () => {
			this.#transitionFrame = null;
			if (!this.#isCurrentTransition(generation, open)) return;

			const contentNode = this.#contentNode;
			if (!contentNode || typeof contentNode.getAnimations !== 'function') {
				this.#completeTransition(generation, open);
				return;
			}

			let animations: Animation[];
			try {
				animations = contentNode.getAnimations({ subtree: true });
			} catch {
				this.#completeTransition(generation, open);
				return;
			}

			if (animations.length === 0) {
				this.#completeTransition(generation, open);
				return;
			}

			void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
				this.#completeTransition(generation, open);
			});
		};

		const scheduleAnimationRead = () => {
			if (typeof window.requestAnimationFrame === 'function') {
				this.#transitionFrame = window.requestAnimationFrame(readAnimations);
			} else {
				queueMicrotask(readAnimations);
			}
		};

		const prepareAnimationRead = () => {
			this.#transitionFrame = null;
			if (!this.#isCurrentTransition(generation, open)) return;
			if (open) {
				this.presenceStatus = undefined;
				scheduleAnimationRead();
				return;
			}
			readAnimations();
		};

		if (typeof window.requestAnimationFrame === 'function') {
			this.#transitionFrame = window.requestAnimationFrame(prepareAnimationRead);
		} else {
			queueMicrotask(prepareAnimationRead);
		}
	}

	#isCurrentTransition(generation: number, open: boolean) {
		return !this.#destroyed && generation === this.#transitionGeneration && this.open === open;
	}

	#completeTransition(generation: number, open: boolean) {
		if (!this.#isCurrentTransition(generation, open)) return;
		this.presenceStatus = undefined;
		if (!open) this.shouldRender = false;
		this.#readOnOpenChangeComplete()?.(open);
	}

	#cancelTransitionFrame() {
		if (this.#transitionFrame === null) return;
		window.cancelAnimationFrame(this.#transitionFrame);
		this.#transitionFrame = null;
	}

	registerTrigger(triggerId: string, readTrigger: TriggerReader) {
		this.#triggers.set(triggerId, readTrigger);
		return () => {
			if (this.#triggers.get(triggerId) === readTrigger) {
				this.#triggers.delete(triggerId);
			}
		};
	}

	isActiveTrigger(triggerId: string) {
		return this.open && this.activeTriggerId === triggerId;
	}

	registerContentId(readContentId: ContentIdReader) {
		this.#readContentId = readContentId;
		return () => {
			if (this.#readContentId === readContentId) {
				this.#readContentId = () => this.defaultContentId;
			}
		};
	}
}

export const [getTooltipLayerContext, setTooltipLayerContext] =
	createContext<TooltipLayerContext>();

export function tryGetTooltipLayerContext() {
	try {
		return getTooltipLayerContext();
	} catch {
		return undefined;
	}
}

export class TooltipTetherBridge {
	layer = $state<TooltipLayerContext | null>(null);
	#triggers = new Map<string, TriggerReader>();

	registerLayer(layer: TooltipLayerContext) {
		this.layer = layer;
		return () => {
			if (this.layer === layer) this.layer = null;
		};
	}

	registerTrigger(triggerId: string, readTrigger: TriggerReader) {
		this.#triggers.set(triggerId, readTrigger);
		return () => {
			if (this.#triggers.get(triggerId) === readTrigger) {
				this.#triggers.delete(triggerId);
			}
		};
	}

	getTrigger(triggerId: string) {
		return this.#triggers.get(triggerId)?.() ?? null;
	}
}

const tetherBridges = new WeakMap<TooltipTether, TooltipTetherBridge>();

export function getTooltipTetherBridge(tether: TooltipTether) {
	let bridge = tetherBridges.get(tether);
	if (!bridge) {
		bridge = new TooltipTetherBridge();
		tetherBridges.set(tether, bridge);
	}
	return bridge;
}
