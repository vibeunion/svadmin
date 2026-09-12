import type {
  DataProvider,
  MenuItem,
  ResourceDefinition,
} from '@svadmin/core';
import { inMemoryDataProvider as exampleDbProvider } from '../../../../../example/src/providers/inMemoryDb';
import { createResources } from '../../../../../example/src/resources';
import { createPostProvider } from './post-provider';

export const postsResource: ResourceDefinition = {
  name: 'posts',
  label: 'Posts',
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canShow: true,
  fields: [
    { key: 'id', label: 'ID', type: 'number', sortable: false, showInForm: false },
    { key: 'title', label: 'Title', type: 'text', searchable: true, required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
  defaultSort: { field: 'id', order: 'asc' },
};

export const dataProvider: DataProvider = createPostProvider(exampleDbProvider);

const fullResources = createResources('en').filter((r: ResourceDefinition) => r.fields && r.fields.length > 0);

export const resources: ResourceDefinition[] = [
  postsResource,
  ...fullResources
    .filter((r: ResourceDefinition) => r.name !== 'posts')
    .map(({ contract: _ignored, ...resource }) => resource),
];

export function getResource(name: string): ResourceDefinition | undefined {
  return resources.find((r) => r.name === name);
}

export const menu: MenuItem[] = [
  { name: "home", label: "Dashboard", href: "/lite" },
  {
    name: "inventory",
    label: "Inventory",
    children: [
      { name: "products", label: "Products", href: "/lite/products" },
      { name: "skus", label: "SKUs", href: "/lite/skus" },
      { name: "categories", label: "Categories", href: "/lite/categories" },
      { name: "suppliers", label: "Suppliers", href: "/lite/suppliers" },
      { name: "warehouses", label: "Warehouses", href: "/lite/warehouses" },
    ],
  },
  {
    name: "operations",
    label: "Operations",
    children: [
      { name: "stock_movements", label: "Stock Movements", href: "/lite/stock_movements" },
      { name: "purchase_orders", label: "Purchase Orders", href: "/lite/purchase_orders" },
      { name: "sales_orders", label: "Sales Orders", href: "/lite/sales_orders" },
      { name: "todos", label: "Todo", href: "/lite/todos" },
      { name: "stock_transfers", label: "Stock Transfers", href: "/lite/stock_transfers" },
      { name: "cycle_counts", label: "Cycle Counts", href: "/lite/cycle_counts" },
      { name: "inventory_adjustments", label: "Inventory Adjustments", href: "/lite/inventory_adjustments" },
      { name: "reorder_rules", label: "Reorder Rules", href: "/lite/reorder_rules" },
    ],
  },
  {
    name: "users_org",
    label: "User Management",
    children: [
      { name: "users", label: "Users", href: "/lite/users" },
      { name: "roles", label: "Roles", href: "/lite/roles" },
      { name: "permissions", label: "Permissions", href: "/lite/permissions" },
      { name: "user_accounts", label: "User Accounts", href: "/lite/user_accounts" },
      { name: "user_logs", label: "User Logs", href: "/lite/user_logs" },
      { name: "user_settings", label: "User Settings", href: "/lite/user_settings" },
    ],
  },
  {
    name: "planning",
    label: "Planning",
    children: [
      { name: "calendar_events", label: "Calendar", href: "/lite/calendar_events" },
      { name: "todos", label: "Todos", href: "/lite/todos" },
    ],
  },
  {
    name: "intelligence",
    label: "Intelligence",
    children: [
      { name: "ai_conversations", label: "AI Chat", href: "/lite/ai_conversations" },
      { name: "ai_prompt", label: "AI Prompt", href: "/lite/ai_prompt" },
    ],
  },
  {
    name: "communications",
    label: "Notifications & Mail",
    children: [
      { name: "notifications", label: "Notification Center", href: "/lite/notifications" },
      { name: "mail_inbox", label: "Mail Inbox", href: "/lite/mail_inbox" },
      { name: "mail_draft", label: "Mail Drafts", href: "/lite/mail_draft" },
      { name: "mail_sent", label: "Mail Sent", href: "/lite/mail_sent" },
      { name: "mail_archive", label: "Mail Archive", href: "/lite/mail_archive" },
    ],
  },
  {
    name: "crm",
    label: "CRM",
    children: [
      { name: "crm_accounts", label: "Customer Accounts", href: "/lite/crm_accounts" },
      { name: "crm_contacts", label: "Customer Contacts", href: "/lite/crm_contacts" },
      { name: "crm_deals", label: "Revenue Opportunities", href: "/lite/crm_deals" },
      { name: "crm_activities", label: "Customer Activities", href: "/lite/crm_activities" },
    ],
  },
  {
    name: "property",
    label: "Real Estate",
    children: [
      { name: "properties", label: "Property Portfolio", href: "/lite/properties" },
      { name: "property_agents", label: "Property Advisors", href: "/lite/property_agents" },
      { name: "property_leads", label: "Property Leads", href: "/lite/property_leads" },
      { name: "property_showings", label: "Tour Schedule", href: "/lite/property_showings" },
    ],
  },
  {
    name: "store",
    label: "Store Operations",
    children: [
      { name: "store_client_products", label: "Store Products", href: "/lite/store_client_products" },
      { name: "store_client_orders", label: "Store Orders", href: "/lite/store_client_orders" },
      { name: "project_planning", label: "Project Planning", href: "/lite/project_planning" },
      { name: "store_admin", label: "Store Admin", href: "/lite/store_admin" },
      { name: "store_services", label: "Store Services", href: "/lite/store_services" },
      { name: "invoice_generator", label: "Invoice Generator", href: "/lite/invoice_generator" },
    ],
  },
  {
    name: "billing",
    label: "Billing",
    children: [
      { name: "billing_plans", label: "Plans", href: "/lite/billing_plans" },
      { name: "billing_invoices", label: "Billing History", href: "/lite/billing_invoices" },
      { name: "billing_subscriptions", label: "Subscriptions", href: "/lite/billing_subscriptions" },
    ],
  },
  {
    name: "security",
    label: "Security Operations",
    children: [
      { name: "security_sessions", label: "Current Sessions", href: "/lite/security_sessions" },
      { name: "security_devices", label: "Device Management", href: "/lite/security_devices" },
      { name: "security_allowed_ips", label: "Allowed IPs", href: "/lite/security_allowed_ips" },
      { name: "referral_invites", label: "Invite a Friend", href: "/lite/referral_invites" },
    ],
  },
  {
    name: "content",
    label: "SSR Verification",
    children: [
      { name: "compatibility", label: "Compatibility Fallbacks", href: "/lite/compatibility" },
      { name: "posts", label: "Posts (IE11 SSR Test)", href: "/lite/posts" },
      { name: "parity", label: "Component Parity Tracker", href: "/lite/parity" },
    ],
  },
];
