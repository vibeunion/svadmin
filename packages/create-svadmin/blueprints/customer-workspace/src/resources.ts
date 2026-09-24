import type { AdminResourceDefinition } from '@svadmin/core';
import { customers, followups, approvals, workspaceSettings } from './features/customers/data';

export const uiOnlyResources: readonly string[] = ['workspace_settings'];

export const resources: AdminResourceDefinition[] = [
  {
    name: 'customers', label: '客户', icon: 'users', contract: customers, canDelete: false,
    fields: [
      { key: 'id', label: '编号', type: 'text', showInForm: false, showInList: false },
      { key: 'name', label: '客户名称', type: 'text', required: true, searchable: true, group: '基本信息' },
      { key: 'status', label: '状态', type: 'select', required: true, defaultValue: 'potential', group: '基本信息',
        options: [{ label: '潜在客户', value: 'potential' }, { label: '合作中', value: 'active' }, { label: '已暂停', value: 'paused' }] },
      { key: 'contact', label: '联系人', type: 'text', required: true, group: '联系信息' },
      { key: 'email', label: '邮箱', type: 'email', required: true, showInList: false, group: '联系信息' },
      { key: 'owner', label: '负责人', type: 'text', required: true, group: '跟进安排' },
      { key: 'notes', label: '备注', type: 'textarea', defaultValue: '', showInList: false, group: '跟进安排' },
    ],
  },
  {
    name: 'followups', label: '跟进记录', icon: 'calendar', contract: followups, canDelete: false,
    fields: [
      { key: 'id', label: '编号', type: 'text', showInForm: false, showInList: false },
      { key: 'customerId', label: '客户', type: 'relation', resource: 'customers', optionLabel: 'name', optionValue: 'id', required: true },
      { key: 'summary', label: '跟进内容', type: 'textarea', required: true, searchable: true },
      { key: 'owner', label: '负责人', type: 'text', required: true },
      { key: 'date', label: '跟进日期', type: 'date', required: true },
    ],
  },
  {
    name: 'approvals', label: '审批', icon: 'check', contract: approvals, canCreate: false, canDelete: false,
    fields: [
      { key: 'id', label: '编号', type: 'text', showInForm: false, showInList: false },
      { key: 'title', label: '申请事项', type: 'text', showInForm: false, searchable: true },
      { key: 'applicant', label: '申请人', type: 'text', showInForm: false },
      { key: 'status', label: '审批结果', type: 'select', required: true,
        options: [{ label: '待审批', value: 'pending' }, { label: '已通过', value: 'approved' }, { label: '已驳回', value: 'rejected' }] },
      { key: 'reason', label: '审批意见', type: 'textarea', required: true, showInList: false },
    ],
  },
  {
    name: 'workspace_settings', label: '工作区设置', icon: 'settings', contract: workspaceSettings, fields: [],
    canCreate: false, canEdit: false, canDelete: false, canShow: false,
  },
];
