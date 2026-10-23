<script lang="ts" generics="T extends string">
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  export interface RadioGroupOption<T extends string = string> {
    value: T;
    label: string;
    description?: string;
    disabled?: boolean;
  }

  interface Props<T extends string = string> {
    options: readonly RadioGroupOption<T>[];
    value?: T | null;
    name?: string;
    legend?: string;
    ariaLabel?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    class?: string;
    onchange?: (value: T) => void;
  }

  let {
    options,
    value = $bindable(null),
    name,
    legend,
    ariaLabel,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    class: className = '',
    onchange,
  }: Props<T> = $props();
  const instanceId = $props.id();
  const i18n = useTranslation();
  let groupRoot: HTMLFieldSetElement;
  // 原生 reset 恢复的是初始选中值，而不是最后一次用户选择。值一旦变化就
  // 无法再推断初始状态，因此只在挂载后的首个值快照一次；初始 null 表示
  // 恢复为未选。
  let resetValue: T | null = null;
  let resetCaptured = false;
  let pendingNativeReset: { event: Event; form: HTMLFormElement } | undefined;
  const enabledOptions = $derived(options.filter(option => !option.disabled));
  const tabValue = $derived(enabledOptions.find(option => option.value === value)?.value ?? enabledOptions[0]?.value);

  function syncChecked(): void {
    if (!groupRoot) return;
    for (const input of groupRoot.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      input.checked = input.value === value;
    }
  }

  function flushNativeReset(): void {
    const reset = pendingNativeReset;
    if (!reset || reset.event.eventPhase !== Event.NONE) return;
    pendingNativeReset = undefined;
    if (groupRoot?.form !== reset.form) return;
    // 与 FileUpload 保持同一原生 reset 约定：先等事件分发结束，再读取
    // defaultPrevented。被取消时保留当前值，并修复 happy-dom 在取消前
    // 已清空 checked 的模拟差异；真实浏览器此处是无副作用的重复赋值。
    if (reset.event.defaultPrevented) {
      syncChecked();
      return;
    }
    value = options.some(option => option.value === resetValue) ? resetValue : null;
    syncChecked();
  }

  $effect(() => {
    const form = groupRoot?.form;
    if (!form) return;
    const reset = (event: Event) => {
      flushNativeReset();
      pendingNativeReset = { event, form };
      // reset 事件先于默认动作；等默认动作完成后才能读取最终取消状态。
      setTimeout(flushNativeReset, 0);
    };
    form.addEventListener('reset', reset);
    return () => {
      form.removeEventListener('reset', reset);
      if (pendingNativeReset?.form === form) pendingNativeReset = undefined;
    };
  });

  // Svelte 的 checked 只写 DOM property，不会留下 checked 内容属性，因此
  // 浏览器 reset 默认会清空全部选中项。显式同步 defaultChecked，让原生
  // 默认动作与上面缓存的 resetValue 保持一致；后续用户选择不改变该基线。
  $effect(() => {
    const current = value;
    void options;
    if (!groupRoot) return;
    if (!resetCaptured) {
      resetCaptured = true;
      resetValue = current;
    }
    for (const input of groupRoot.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      input.defaultChecked = resetValue !== null && input.value === resetValue;
    }
  });

  // 空 name 的原生 radio 在同一表单内仍属于同一个浏览器分组，不能靠逐个
  // required 隔离实例。未命名组改用组件内的 custom validity，且不生成字段名。
  // 每次重新同步所有输入，避免切换 name/required/disabled、替换选项或父级
  // 清空后残留旧错误；提示复用现有 i18n 的 validation.required。
  $effect(() => {
    // 先读取全部依赖再分支，避免某次提前返回后漏跟踪 required/disabled/
    // options/value，导致后续状态变化不再清除或重建 custom validity。
    const currentName = name;
    const isRequired = required;
    const isDisabled = disabled;
    const currentValue = value;
    const currentOptions = options;
    const message = i18n.t('validation.required');
    const inputs = groupRoot
      ? [...groupRoot.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
      : [];
    const hasSelection = currentOptions.some(option => !option.disabled && option.value === currentValue);
    const firstEnabledIndex = currentOptions.findIndex(option => !option.disabled);
    for (const input of inputs) input.setCustomValidity('');
    if (!groupRoot || currentName || !isRequired || isDisabled || hasSelection) return;
    if (firstEnabledIndex >= 0) inputs[firstEnabledIndex]?.setCustomValidity(message);
  });

  function select(option: RadioGroupOption<T>): void {
    if (disabled || option.disabled) return;
    // reset 的最终状态要等事件分发结束才能判定；若同一任务内用户已经重新
    // 选择，则最后一次选择优先，作废尚未冲刷的 pending reset。即使新选择
    // 与 reset 前的值相同，也必须先作废并同步 DOM，否则延迟冲刷会用初始值
    // 覆盖它，reset 的默认动作也可能留下与绑定值不一致的 checked。
    const hadPendingReset = pendingNativeReset !== undefined;
    pendingNativeReset = undefined;
    if (value !== option.value) {
      value = option.value;
      onchange?.(option.value);
    }
    if (hadPendingReset) syncChecked();
  }

  const focusableSelector = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    'summary',
    '[tabindex]',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(',');

  function isContentEditableHost(element: HTMLElement): boolean {
    const attribute = element.getAttribute('contenteditable');
    const editable = element.isContentEditable || (attribute !== null && attribute.toLowerCase() !== 'false');
    return editable && !element.parentElement?.isContentEditable;
  }

  // 与现有 UI focus helper 保持同一判定：排除原生禁用、inert/隐藏区域和
  // 不可见元素，并把 contenteditable 宿主视为真实 Tab 停靠点。aria-disabled
  // 和 aria-hidden 不等于原生不可聚焦，不能据此跳过宿主真实的 Tab 停靠点。
  function isTabbable(element: HTMLElement): boolean {
    if (element.matches(':disabled')) return false;
    if (element.closest('[hidden], [inert]')) return false;
    if (element.hasAttribute('tabindex') && element.tabIndex < 0) return false;
    if (!element.hasAttribute('tabindex') && !isContentEditableHost(element) && element.tabIndex < 0) return false;
    return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  // 只有非空 name 才参与原生命名分组；name="" 与省略 name 语义一致。
  function hasNonEmptyName(input: HTMLInputElement): boolean {
    return input.name !== '';
  }

  function tabbableSequence(form: HTMLFormElement): HTMLElement[] {
    // 只取零序 Tab 停靠点。正 tabindex 元素已在文档起点先访问，不能当作
    // 当前组之后的下一个停靠点；contenteditable 宿主即使 tabIndex 报告 -1
    // 也仍在浏览器 Tab 顺序中。范围收敛到当前表单，不重写整页焦点顺序。
    return [...form.querySelectorAll<HTMLElement>(focusableSelector)]
      .filter(element => (element.tabIndex === 0
        || (!element.hasAttribute('tabindex') && isContentEditableHost(element)))
        && isTabbable(element));
  }

  function handleGroupTab(event: KeyboardEvent): void {
    // WebKit 会把同一表单内空 name 的 radio 视为同一原生组，并在 Tab 时
    // 跳过后续未命名 RadioGroup。只有同表单存在多个未命名实例时才接管，
    // 且只接管确实落在本组件未命名组上的目标；普通原生 radio、contenteditable、
    // inert 边界交还浏览器。先聚焦成功再取消默认行为，避免半途困住键盘。
    const form = groupRoot.form ?? groupRoot.closest('form');
    const current = document.activeElement;
    if (!form || !(current instanceof HTMLInputElement) || !groupRoot.contains(current)) return;
    const unnamedGroups = [...form.querySelectorAll<HTMLElement>('[data-svadmin-radio-group]')]
      .filter(group => ![...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')].some(hasNonEmptyName));
    if (unnamedGroups.length < 2) return;
    const sequence = tabbableSequence(form);
    const contained = sequence.filter(element => groupRoot.contains(element));
    if (!contained.length) return;
    const firstContained = contained[0];
    const lastContained = contained[contained.length - 1];
    if (!firstContained || !lastContained) return;
    const first = sequence.indexOf(firstContained);
    const last = sequence.indexOf(lastContained);
    if (first < 0 || last < 0) return;
    const target = event.shiftKey ? sequence[first - 1] : sequence[last + 1];
    if (!(target instanceof HTMLInputElement) || target.type !== 'radio') return;
    const targetGroup = target.closest<HTMLElement>('[data-svadmin-radio-group]');
    if (!targetGroup || targetGroup === groupRoot) return;
    if ([...targetGroup.querySelectorAll<HTMLInputElement>('input[type="radio"]')].some(hasNonEmptyName)) return;
    // 保留平台默认的滚动行为，让窄屏上的键盘焦点进入视口。
    target.focus();
    if (document.activeElement === target) event.preventDefault();
  }

  function handleKeydown(event: KeyboardEvent): void {
    const current = event.currentTarget;
    if (name || disabled || event.altKey || event.ctrlKey || event.metaKey
      || !(current instanceof HTMLInputElement) || current.matches(':disabled')) return;
    if (event.key === 'Tab') {
      handleGroupTab(event);
      return;
    }
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    // 未命名 radio 的原生方向键可能跨越 fieldset；只在当前组件内选择。
    const inputs = [...groupRoot.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
      .filter(input => !input.matches(':disabled'));
    const index = inputs.indexOf(current);
    if (index < 0) return;
    const rtl = getComputedStyle(groupRoot).direction === 'rtl';
    const forward = event.key === 'ArrowDown' || event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? inputs.length - 1
      : (index + (forward ? 1 : -1) + inputs.length) % inputs.length;
    const next = inputs[nextIndex];
    event.preventDefault();
    next?.focus();
    next?.click();
  }
</script>

  <fieldset
    bind:this={groupRoot}
    class={cn('svadmin-radio-group', className)}
    data-svadmin-radio-group
    disabled={disabled}
  data-invalid={invalid ? 'true' : undefined}
  aria-describedby={describedby}
  aria-label={legend ? undefined : ariaLabel}
>
  {#if legend}<legend>{legend}</legend>{/if}
  <div class="svadmin-radio-group__options">
    {#each options as option, index (option.value)}
      {@const inputId = `${instanceId}-radio-${index}`}
      <label class="svadmin-radio-group__option" class:svadmin-radio-group__option--disabled={disabled || option.disabled} for={inputId}>
        <input
          id={inputId}
          type="radio"
          {name}
          value={option.value}
          checked={value === option.value}
          disabled={disabled || option.disabled}
          required={required && Boolean(name)}
          aria-describedby={describedby}
          tabindex={name ? undefined : !disabled && !option.disabled && option.value === tabValue ? 0 : -1}
          onkeydown={handleKeydown}
          onchange={() => select(option)}
        />
        <span class="svadmin-radio-group__copy">
          <span>{option.label}</span>
          {#if option.description}<small>{option.description}</small>{/if}
        </span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .svadmin-radio-group {
    min-inline-size: 0;
    border: 0;
    padding: 0;
    margin: 0;
  }

  .svadmin-radio-group legend {
    padding: 0;
    margin-block-end: 8px;
    color: var(--foreground);
    font-weight: 600;
  }

  .svadmin-radio-group__options {
    display: grid;
    gap: 8px;
  }

  .svadmin-radio-group__option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-block-size: 32px;
    cursor: pointer;
  }

  .svadmin-radio-group__option--disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .svadmin-radio-group__copy {
    display: grid;
    gap: 2px;
  }

  .svadmin-radio-group__copy small {
    color: var(--muted-foreground);
  }
</style>
