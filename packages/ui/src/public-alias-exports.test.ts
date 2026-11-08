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
  TabBar,
  WorkspaceTabBar,
  Mention,
  MentionsInput,
  Paragraph,
  TypographyText,
  Typography,
  Title,
  RoleSwitcher,
  RealtimeMonitorView,
  IconAudit,
  IconWorkflow,
  IconSeal,
  IconTenant,
  IconMonitor,
  IconSecurity,
  IconBilling,
  IconCluster,
  IconApprove,
  IconReject,
  CheckCard,
  StatisticCard,
  MaskedText,
  SensitiveDataMask,
  WaterMark,
  Watermark,
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
    expect(TabBar).toBe(WorkspaceTabBar);
    expect(Mention).toBe(MentionsInput);
    expect(Paragraph).toBe(TypographyText);
    expect(Typography).toBe(Title);
  });

  it('keeps compound namespace aliases bound to canonical namespaces', () => {
    expect(Modal.Root).toBeDefined();
    expect(Drawer.Root).toBeDefined();
    expect(Dropdown.Root).toBeDefined();
  });

  it('exports enterprise pro suite components and business icons', () => {
    expect(RoleSwitcher).toBeDefined();
    expect(RealtimeMonitorView).toBeDefined();
    expect(IconAudit).toBeDefined();
    expect(IconWorkflow).toBeDefined();
    expect(IconSeal).toBeDefined();
    expect(IconTenant).toBeDefined();
    expect(IconMonitor).toBeDefined();
    expect(IconSecurity).toBeDefined();
    expect(IconBilling).toBeDefined();
    expect(IconCluster).toBeDefined();
    expect(IconApprove).toBeDefined();
    expect(IconReject).toBeDefined();
    expect(CheckCard).toBeDefined();
    expect(StatisticCard).toBeDefined();
    expect(MaskedText).toBe(SensitiveDataMask);
    expect(WaterMark).toBe(Watermark);
  });

  it('keeps service aliases bound to canonical services', () => {
    expect(Message).toBe(toast);
    expect(message).toBe(toast);
    expect(Notification).toBe(notification);
  });
});
