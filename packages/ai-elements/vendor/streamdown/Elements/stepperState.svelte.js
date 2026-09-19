import { defineGetter } from '../utils/bind.js';
export class StepperState {
    keyFramesOptions;
    activeStep = $state(0);
    destinationOffset = $state(0);
    stepAnimation = $state();
    offsets = $state([]);
    stepHeights = $state([]);
    stepContainer = null;
    isAnimating = $state(false);
    constructor(props) {
        this.keyFramesOptions = props.keyFramesOptions;
        defineGetter(this, 'items', () => props.items);
    }
    translate = () => {
        if (this.destinationOffset !== this.offsets[this.activeStep] && this.stepContainer) {
            this.destinationOffset = this.offsets[this.activeStep];
            this.stepAnimation?.cancel();
            this.stepAnimation = this.stepContainer.animate({
                transform: `translateX(-${this.offsets[this.activeStep]}px)`
            }, this.keyFramesOptions);
            this.stepAnimation.onfinish = () => {
                this.stepAnimation = undefined;
            };
        }
    };
    setActiveStep = (i) => () => {
        if (!this.canGoToStep(i) || !this.stepContainer)
            return;
        const previousStep = this.stepContainer.children[this.activeStep];
        const nextStep = this.stepContainer.children[i];
        if (!previousStep || !nextStep)
            return;
        this.activeStep = i;
        this.translate();
        previousStep.animate({
            opacity: `0`
        }, this.keyFramesOptions);
        nextStep.animate({
            opacity: `1`
        }, this.keyFramesOptions);
    };
    scroller = (node) => {
        const onScroll = (e) => {
            e.preventDefault();
            node.scrollTo(0, 0);
        };
        node.addEventListener('scroll', onScroll);
        node.scrollTo(0, 0);
        const steps = node.querySelectorAll('[data-step]');
        const setOffsets = () => {
            this.offsets = Array.from(steps, (step) => step.offsetLeft);
            this.translate();
        };
        const resizeObserver = new ResizeObserver(setOffsets);
        resizeObserver.observe(node);
        setOffsets();
        return {
            destroy: () => {
                resizeObserver.unobserve(node);
                node.removeEventListener('scroll', onScroll);
                this.activeStep = 0;
                this.offsets = [];
                this.destinationOffset = 0;
            }
        };
    };
    next = () => {
        if (this.activeStep < this.items.length - 1) {
            this.setActiveStep(this.activeStep + 1)();
        }
    };
    previous = () => {
        if (this.activeStep > 0) {
            this.setActiveStep(this.activeStep - 1)();
        }
    };
    goTo = (i) => {
        if (this.canGoToStep(i)) {
            this.setActiveStep(i)();
        }
    };
    get canGoNext() {
        return this.activeStep < this.items.length - 1;
    }
    get canGoPrevious() {
        return this.activeStep > 0;
    }
    canGoToStep = (targetStep) => {
        return targetStep >= 0 && targetStep < this.items.length;
    };
}
