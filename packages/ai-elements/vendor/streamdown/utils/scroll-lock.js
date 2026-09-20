const scrollLockState = new WeakMap();
function getScrollLockState(targetDocument) {
    let state = scrollLockState.get(targetDocument);
    if (!state) {
        state = {
            count: 0,
            previousOverflow: ''
        };
        scrollLockState.set(targetDocument, state);
    }
    return state;
}
export function lockBodyScroll(targetDocument = document) {
    const state = getScrollLockState(targetDocument);
    if (state.count === 0) {
        state.previousOverflow = targetDocument.body.style.overflow;
        targetDocument.body.style.overflow = 'hidden';
    }
    state.count += 1;
    let released = false;
    return () => {
        if (released) {
            return;
        }
        released = true;
        state.count = Math.max(0, state.count - 1);
        if (state.count === 0) {
            targetDocument.body.style.overflow = state.previousOverflow;
        }
    };
}
export function resetBodyScrollLocksForTests(targetDocument = document) {
    scrollLockState.delete(targetDocument);
    targetDocument.body.style.overflow = '';
}
