import { TaskError } from './task-contract';

export function taskClientField(value: unknown, key: string): unknown {
  try {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const field: unknown = Reflect.get(value, key);
      return field;
    }
  } catch {
    // Configuration accessors must not leak SDK credentials.
  }
  throw new TaskError('INVALID_TASK_INPUT');
}

export function taskClientMethod(value: unknown, key: string, optional = false): ((...args: unknown[]) => unknown) | undefined {
  const callable = taskClientField(value, key);
  if (callable === undefined && optional) return undefined;
  if (typeof callable !== 'function') throw new TaskError('INVALID_TASK_INPUT');
  return (...args) => {
    const result: unknown = Reflect.apply(callable, value, args);
    return result;
  };
}

export function requiredTaskClientMethod(value: unknown, key: string): (...args: unknown[]) => unknown {
  const method = taskClientMethod(value, key);
  if (!method) throw new TaskError('INVALID_TASK_INPUT');
  return method;
}

export function reportTaskError(error: TaskError, onError?: (error: TaskError) => void): void {
  if (!onError) { console.error(error); return; }
  try {
    void Promise.resolve(onError(error)).catch(() => console.error(new TaskError('TASK_CALLBACK_FAILED')));
  }
  catch { console.error(new TaskError('TASK_CALLBACK_FAILED')); }
}

export function taskHandleField(value: unknown, key: string, write = false): unknown {
  try {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) return undefined;
      if ('value' in descriptor) {
        const field: unknown = descriptor.value;
        if (field === undefined) throw new TaskError('INVALID_TASK_RESPONSE', write);
        return field;
      }
    }
  } catch {
    // Handle accessors and reflection errors cannot carry trusted protocol values.
  }
  throw new TaskError('INVALID_TASK_RESPONSE', write);
}

export function taskHandleMethod(value: unknown, key: string, write = false): (...args: unknown[]) => unknown {
  const callable = taskHandleField(value, key, write);
  if (typeof callable !== 'function') throw new TaskError('INVALID_TASK_RESPONSE', write);
  return (...args) => {
    const result: unknown = Reflect.apply(callable, value, args);
    return result;
  };
}

/** Validate synchronous events before publishing, but wait for a valid cleanup handle. */
export function validatedTaskSubscription<T>(
  start: (onUpdate: (value: unknown) => void, onFailure: (error: unknown) => void) => unknown,
  decode: (value: unknown) => T,
  callback: (task: T) => void,
  onError?: (error: TaskError) => void,
): () => void {
  if (typeof callback !== 'function' || onError !== undefined && typeof onError !== 'function') {
    throw new TaskError('INVALID_TASK_INPUT');
  }
  let stopped = false;
  let ready = false;
  let cleanup: (() => unknown) | undefined;
  const buffered: T[] = [];
  const release = () => {
    try {
      void Promise.resolve(cleanup?.()).catch(() => reportTaskError(new TaskError('TASK_SUBSCRIPTION_FAILED'), onError));
    } catch { reportTaskError(new TaskError('TASK_SUBSCRIPTION_FAILED'), onError); }
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    buffered.length = 0;
    release();
  };
  const emit = (task: T) => {
    if (stopped) return;
    try {
      void Promise.resolve(callback(task)).catch(() => reportTaskError(new TaskError('TASK_CALLBACK_FAILED'), onError));
    }
    catch { reportTaskError(new TaskError('TASK_CALLBACK_FAILED'), onError); }
  };
  const fail = (error: TaskError) => {
    if (stopped) return;
    stop();
    reportTaskError(error, onError);
  };
  try {
    const subscription = start(value => {
      if (stopped) return;
      let task: T;
      try { task = decode(value); }
      catch (error) {
        fail(new TaskError(error instanceof TaskError ? error.code : 'INVALID_TASK_RESPONSE'));
        return;
      }
      if (ready) emit(task);
      else buffered.push(task);
    }, () => fail(new TaskError('TASK_SUBSCRIPTION_FAILED')));
    if (subscription instanceof Promise) {
      void Promise.resolve<unknown>(subscription).catch(() => {});
      throw new TaskError('TASK_SUBSCRIPTION_FAILED');
    }
    cleanup = typeof subscription === 'function'
      ? () => { const result: unknown = Reflect.apply(subscription, undefined, []); return result; }
      : taskHandleMethod(subscription, 'unsubscribe');
    if (stopped) release();
    else {
      ready = true;
      for (const task of buffered) emit(task);
      buffered.length = 0;
    }
  } catch {
    stop();
    throw new TaskError('TASK_SUBSCRIPTION_FAILED');
  }
  return stop;
}
