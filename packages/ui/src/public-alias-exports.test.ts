import { describe, expect, it } from 'vitest';
import {
  Comment,
  CommentThread,
  Descriptions,
  DescriptionList,
  InputNumber,
  InputTag,
  List,
  ItemList,
  Message,
  Modal,
  Drawer,
  Dropdown,
  Notification,
  NumberInput,
  Radio,
  RadioGroup,
  Split,
  SplitPaneLayout,
  TagsInput,
  VerificationCode,
  OtpInput,
  message,
  notification,
  toast,
} from './index.js';

describe('public compatibility aliases', () => {
  it('keeps Reference-style component aliases bound to canonical components', () => {
    expect(Comment).toBe(CommentThread);
    expect(Descriptions).toBe(DescriptionList);
    expect(InputTag).toBe(TagsInput);
    expect(InputNumber).toBe(NumberInput);
    expect(List).toBe(ItemList);
    expect(Radio).toBe(RadioGroup);
    expect(Split).toBe(SplitPaneLayout);
    expect(VerificationCode).toBe(OtpInput);
  });

  it('keeps compound namespace aliases bound to canonical namespaces', () => {
    expect(Modal.Root).toBeDefined();
    expect(Drawer.Root).toBeDefined();
    expect(Dropdown.Root).toBeDefined();
  });

  it('keeps service aliases bound to canonical services', () => {
    expect(Message).toBe(toast);
    expect(message).toBe(toast);
    expect(Notification).toBe(notification);
  });
});
