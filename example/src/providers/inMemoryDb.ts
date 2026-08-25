import type {
  BaseRecord,
  CreateManyParams,
  CreateManyResult,
  CreateParams,
  CreateResult,
  DataProvider,
  DeleteManyParams,
  DeleteManyResult,
  DeleteParams,
  DeleteResult,
  FieldFilter,
  Filter,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyResult,
  GetOneParams,
  GetOneResult,
  LogicalFilter,
  Pagination,
  Sort,
  UpdateManyParams,
  UpdateManyResult,
  UpdateParams,
  UpdateResult,
} from '@svadmin/core';

const STORAGE_KEY = 'svadmin_inventory_demo_db_v5';

type ResourceName =
  | 'case_workspace'
  | 'products'
  | 'skus'
  | 'categories'
  | 'suppliers'
  | 'warehouses'
  | 'stock_movements'
  | 'purchase_orders'
  | 'sales_orders'
  | 'todos'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'user_accounts'
  | 'user_logs'
  | 'user_settings'
  | 'calendar_events'
  | 'ai_conversations'
  | 'notifications'
  | 'stock_transfers'
  | 'cycle_counts'
  | 'inventory_adjustments'
  | 'reorder_rules'
  | 'crm_accounts'
  | 'crm_contacts'
  | 'crm_deals'
  | 'crm_activities'
  | 'properties'
  | 'property_agents'
  | 'property_leads'
  | 'property_showings'
  | 'mail_inbox'
  | 'mail_draft'
  | 'mail_sent'
  | 'mail_archive'
  | 'mail_snoozed'
  | 'mail_spam'
  | 'mail_trash'
  | 'store_client_products'
  | 'store_client_orders'
  | 'project_planning'
  | 'store_admin'
  | 'store_services'
  | 'ai_prompt'
  | 'invoice_generator'
  | 'billing_plans'
  | 'billing_invoices'
  | 'billing_subscriptions'
  | 'security_sessions'
  | 'security_devices'
  | 'security_allowed_ips'
  | 'referral_invites';
type DbState = Record<ResourceName, BaseRecord[]>;

const initialDbState: DbState = {
  case_workspace: [],
  categories: [
    { id: 1, name: 'Electronics', code: 'ELEC', description: 'Devices and accessories' },
    { id: 2, name: 'Furniture', code: 'FURN', description: 'Workspace furniture' },
    { id: 3, name: 'Office Supplies', code: 'OFFC', description: 'Consumables and stationery' },
  ],
  suppliers: [
    {
      id: 1,
      name: 'Northstar Components',
      contactName: 'Avery Chen',
      email: 'avery@northstar.example',
      phone: '+1 212 555 0142',
      address: '214 Harbor Ave, New York',
    },
    {
      id: 2,
      name: 'Workspace Goods Co.',
      contactName: 'Maya Ortiz',
      email: 'maya@workspace.example',
      phone: '+1 415 555 0188',
      address: '87 Market St, San Francisco',
    },
    {
      id: 3,
      name: 'Pacific Packing',
      contactName: 'Noah Patel',
      email: 'noah@pacificpacking.example',
      phone: '+1 206 555 0119',
      address: '510 Pier Road, Seattle',
    },
  ],
  warehouses: [
    { id: 1, name: 'Main Warehouse', code: 'WH-MAIN', location: 'New York', capacity: 2400, utilization: 68 },
    { id: 2, name: 'West Hub', code: 'WH-WEST', location: 'Los Angeles', capacity: 1600, utilization: 52 },
    { id: 3, name: 'Returns Bay', code: 'WH-RET', location: 'Chicago', capacity: 600, utilization: 31 },
  ],
  products: [
    {
      id: 1,
      name: 'Laptop Pro 15',
      sku: 'LAP-PRO-15',
      categoryId: 1,
      supplierId: 1,
      price: 1299,
      stock: 45,
      minStock: 10,
      description: 'High-performance laptop for field teams',
    },
    {
      id: 2,
      name: 'Ergonomic Chair',
      sku: 'CHR-ERG-01',
      categoryId: 2,
      supplierId: 2,
      price: 249,
      stock: 4,
      minStock: 6,
      description: 'Adjustable chair for office workstations',
    },
    {
      id: 3,
      name: 'Wireless Mouse',
      sku: 'MOU-WRL-02',
      categoryId: 1,
      supplierId: 1,
      price: 49,
      stock: 150,
      minStock: 20,
      description: 'Compact wireless mouse',
    },
    {
      id: 4,
      name: 'Packing Tape',
      sku: 'SUP-TAPE-01',
      categoryId: 3,
      supplierId: 3,
      price: 8,
      stock: 18,
      minStock: 24,
      description: 'Heavy-duty carton sealing tape',
    },
  ],
  skus: [
    { id: 1, sku: 'LAP-PRO-15', productId: 1, barcode: '810000000151', variant: '15 inch / Space Gray', status: 'active' },
    { id: 2, sku: 'CHR-ERG-01', productId: 2, barcode: '810000000182', variant: 'Black mesh', status: 'active' },
    { id: 3, sku: 'MOU-WRL-02', productId: 3, barcode: '810000000205', variant: 'Graphite', status: 'active' },
    { id: 4, sku: 'SUP-TAPE-01', productId: 4, barcode: '810000000229', variant: '48 mm roll', status: 'active' },
  ],
  stock_movements: [
    { id: 1, productId: 1, warehouseId: 1, quantity: 50, type: 'in', note: 'Initial receiving', date: '2026-06-01' },
    { id: 2, productId: 1, warehouseId: 1, quantity: -5, type: 'out', note: 'Sales order shipment', date: '2026-06-05' },
    { id: 3, productId: 2, warehouseId: 2, quantity: 4, type: 'in', note: 'Supplier delivery', date: '2026-06-08' },
    { id: 4, productId: 4, warehouseId: 3, quantity: -12, type: 'out', note: 'Packing line consumption', date: '2026-06-09' },
  ],
  purchase_orders: [
    {
      id: 1,
      orderNumber: 'PO-2026-001',
      supplierId: 1,
      status: 'received',
      totalAmount: 58500,
      orderDate: '2026-06-01',
      deliveryDate: '2026-06-05',
    },
    {
      id: 2,
      orderNumber: 'PO-2026-002',
      supplierId: 2,
      status: 'ordered',
      totalAmount: 3000,
      orderDate: '2026-06-10',
      deliveryDate: '2026-06-18',
    },
    {
      id: 3,
      orderNumber: 'PO-2026-003',
      supplierId: 3,
      status: 'draft',
      totalAmount: 960,
      orderDate: '2026-06-11',
      deliveryDate: '2026-06-20',
    },
  ],
  sales_orders: [
    {
      id: 1,
      orderNumber: 'SO-2026-001',
      customerName: 'Acme Corp',
      status: 'shipped',
      totalAmount: 6495,
      orderDate: '2026-06-04',
      shippingDate: '2026-06-06',
    },
    {
      id: 2,
      orderNumber: 'SO-2026-002',
      customerName: 'Wayne Enterprises',
      status: 'pending',
      totalAmount: 499,
      orderDate: '2026-06-10',
      shippingDate: '2026-06-12',
    },
  ],
  todos: [
    {
      id: 1,
      title: 'Check low stock alerts',
      assigneeId: 2,
      dueDate: '2026-06-11',
      priority: 'high',
      status: 'in_progress',
      completed: false,
      notes: 'Review products below minimum stock and prepare replenishment orders.',
    },
    {
      id: 2,
      title: 'Verify Workspace Goods delivery',
      assigneeId: 3,
      dueDate: '2026-06-13',
      priority: 'medium',
      status: 'done',
      completed: true,
      notes: 'Match incoming quantities against PO-2026-002.',
    },
    {
      id: 3,
      title: 'Cycle count for WH-MAIN',
      assigneeId: 2,
      dueDate: '2026-06-15',
      priority: 'medium',
      status: 'open',
      completed: false,
      notes: 'Focus on fast-moving electronics SKUs.',
    },
  ],
  roles: [
    { id: 1, name: 'Inventory Admin', slug: 'inventory-admin', scope: 'All warehouses and user management', level: 'owner', description: 'Can configure platform settings and manage access.' },
    { id: 2, name: 'Warehouse Manager', slug: 'warehouse-manager', scope: 'Warehouse operations', level: 'manager', description: 'Can manage stock, movements, orders, and cycle counts.' },
    { id: 3, name: 'Operations Analyst', slug: 'operations-analyst', scope: 'Planning and reporting', level: 'operator', description: 'Can review dashboards, tasks, calendar events, and AI recommendations.' },
    { id: 4, name: 'Read Only Auditor', slug: 'read-only-auditor', scope: 'Audit review', level: 'viewer', description: 'Can inspect records without changing operational data.' },
    { id: 5, name: 'Purchasing Lead', slug: 'purchasing-lead', scope: 'Supplier and purchase orders', level: 'manager', description: 'Can coordinate suppliers, approvals, and incoming orders.' },
    { id: 6, name: 'Sales Coordinator', slug: 'sales-coordinator', scope: 'Sales orders and customers', level: 'operator', description: 'Can manage sales order follow-up and customer coordination.' },
    { id: 7, name: 'Support Agent', slug: 'support-agent', scope: 'Mail, notifications, and feedback', level: 'operator', description: 'Can triage support conversations and notification queues.' },
    { id: 8, name: 'CRM Manager', slug: 'crm-manager', scope: 'Accounts, contacts, and deals', level: 'manager', description: 'Can manage CRM accounts, pipeline, notes, and reports.' },
    { id: 9, name: 'Property Advisor', slug: 'property-advisor', scope: 'Real estate listings and tours', level: 'operator', description: 'Can manage property leads, saved searches, and showings.' },
    { id: 10, name: 'AI Reviewer', slug: 'ai-reviewer', scope: 'AI prompts and assistant governance', level: 'viewer', description: 'Can inspect AI conversations, templates, and prompt policy.' },
  ],
  users: [
    {
      id: 1,
      name: 'Jordan Lee',
      email: 'jordan.lee@example.com',
      roleId: 1,
      status: 'active',
      department: 'Platform Operations',
      lastActiveAt: '2026-06-11',
    },
    {
      id: 2,
      name: 'Priya Raman',
      email: 'priya.raman@example.com',
      roleId: 2,
      status: 'active',
      department: 'Warehouse',
      lastActiveAt: '2026-06-10',
    },
    {
      id: 3,
      name: 'Mateo Silva',
      email: 'mateo.silva@example.com',
      roleId: 3,
      status: 'invited',
      department: 'Planning',
      lastActiveAt: '2026-06-09',
    },
    {
      id: 4,
      name: 'Evelyn Brooks',
      email: 'evelyn.brooks@example.com',
      roleId: 4,
      status: 'active',
      department: 'Finance',
      lastActiveAt: '2026-06-07',
    },
  ],
  permissions: [
    {
      id: 1,
      module: 'Inventory',
      action: 'manage',
      roleId: 1,
      effect: 'allow',
      updatedAt: '2026-06-10',
      notes: 'Platform owners can manage catalog, stock, and order records.',
    },
    {
      id: 2,
      module: 'Purchasing',
      action: 'approve',
      roleId: 2,
      effect: 'review',
      updatedAt: '2026-06-09',
      notes: 'Manager approvals require dual review above threshold.',
    },
    {
      id: 3,
      module: 'Audit',
      action: 'export',
      roleId: 4,
      effect: 'allow',
      updatedAt: '2026-06-08',
      notes: 'Auditors can export read-only compliance snapshots.',
    },
    {
      id: 4,
      module: 'Suppliers',
      action: 'approve',
      roleId: 5,
      effect: 'allow',
      updatedAt: '2026-06-08',
      notes: 'Purchasing leads can approve vendor and purchase order changes.',
    },
    {
      id: 5,
      module: 'Sales',
      action: 'manage',
      roleId: 6,
      effect: 'allow',
      updatedAt: '2026-06-07',
      notes: 'Sales coordinators can update customer orders and fulfillment notes.',
    },
    {
      id: 6,
      module: 'Support',
      action: 'triage',
      roleId: 7,
      effect: 'review',
      updatedAt: '2026-06-07',
      notes: 'Support replies require review before changing customer status.',
    },
    {
      id: 7,
      module: 'CRM',
      action: 'manage',
      roleId: 8,
      effect: 'allow',
      updatedAt: '2026-06-06',
      notes: 'CRM managers can update accounts, deals, activities, and reports.',
    },
    {
      id: 8,
      module: 'Properties',
      action: 'schedule',
      roleId: 9,
      effect: 'allow',
      updatedAt: '2026-06-06',
      notes: 'Property advisors can schedule tours and maintain lead notes.',
    },
    {
      id: 9,
      module: 'AI',
      action: 'review',
      roleId: 10,
      effect: 'review',
      updatedAt: '2026-06-05',
      notes: 'AI reviewers can inspect conversations and approve prompt templates.',
    },
  ],
  user_accounts: [
    {
      id: 1,
      userId: 1,
      accountType: 'internal',
      status: 'active',
      lastSignInAt: '2026-06-11',
      notes: 'Primary admin account with 2FA enabled.',
    },
    {
      id: 2,
      userId: 3,
      accountType: 'internal',
      status: 'pending_review',
      lastSignInAt: '2026-06-09',
      notes: 'Invitation accepted; awaiting role confirmation.',
    },
    {
      id: 3,
      userId: 4,
      accountType: 'partner',
      status: 'locked',
      lastSignInAt: '2026-06-05',
      notes: 'Locked after access review until finance confirms need.',
    },
  ],
  user_logs: [
    {
      id: 1,
      userId: 1,
      event: 'Signed in',
      ipAddress: '192.0.2.18',
      severity: 'info',
      createdAt: '2026-06-11',
      details: 'Successful dashboard session from trusted device.',
    },
    {
      id: 2,
      userId: 3,
      event: 'Role changed',
      ipAddress: '198.51.100.22',
      severity: 'warning',
      createdAt: '2026-06-10',
      details: 'Temporary planning role granted for cycle count rehearsal.',
    },
    {
      id: 3,
      userId: 4,
      event: 'Account locked',
      ipAddress: '203.0.113.11',
      severity: 'critical',
      createdAt: '2026-06-08',
      details: 'Access paused after repeated stale session attempts.',
    },
  ],
  user_settings: [
    {
      id: 1,
      setting: 'Require two-factor authentication',
      scope: 'All active members',
      status: 'enabled',
      ownerId: 1,
      updatedAt: '2026-06-10',
    },
    {
      id: 2,
      setting: 'Invite approval workflow',
      scope: 'Manager and owner roles',
      status: 'enabled',
      ownerId: 2,
      updatedAt: '2026-06-09',
    },
    {
      id: 3,
      setting: 'Dormant account reminder',
      scope: 'Users inactive for 14 days',
      status: 'optional',
      ownerId: 4,
      updatedAt: '2026-06-07',
    },
  ],
  calendar_events: [
    {
      id: 1,
      title: 'WH-MAIN cycle count',
      type: 'cycle_count',
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      ownerId: 2,
      warehouseId: 1,
      status: 'scheduled',
      notes: 'Count electronics bins before reorder review.',
    },
    {
      id: 2,
      title: 'Workspace Goods receiving',
      type: 'receiving',
      startDate: '2026-06-18',
      endDate: '2026-06-18',
      ownerId: 3,
      warehouseId: 2,
      status: 'scheduled',
      notes: 'Prepare dock slot for PO-2026-002.',
    },
    {
      id: 3,
      title: 'Packing supply reorder review',
      type: 'purchase',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      ownerId: 1,
      warehouseId: 3,
      status: 'scheduled',
      notes: 'Review tape consumption trend and supplier lead time.',
    },
  ],
  ai_conversations: [
    {
      id: 1,
      title: 'Low stock replenishment plan',
      intent: 'replenishment',
      ownerId: 2,
      status: 'open',
      lastMessage: 'Suggested reorder quantities for Ergonomic Chair and Packing Tape using current minimum thresholds.',
      updatedAt: '2026-06-11',
    },
    {
      id: 2,
      title: 'June demand forecast',
      intent: 'forecast',
      ownerId: 3,
      status: 'waiting',
      lastMessage: 'Waiting for sales order import before revising forecast confidence.',
      updatedAt: '2026-06-10',
    },
    {
      id: 3,
      title: 'Receiving exception triage',
      intent: 'exception_review',
      ownerId: 1,
      status: 'resolved',
      lastMessage: 'Matched variance to partial delivery; no inventory adjustment required.',
      updatedAt: '2026-06-08',
    },
  ],
  notifications: [
    {
      id: 1,
      title: 'Two products below minimum stock',
      channel: 'inventory',
      severity: 'critical',
      recipientId: 2,
      read: false,
      createdAt: '2026-06-11',
      body: 'Ergonomic Chair and Packing Tape need replenishment review.',
    },
    {
      id: 2,
      title: 'PO-2026-002 delivery scheduled',
      channel: 'order',
      severity: 'info',
      recipientId: 3,
      read: false,
      createdAt: '2026-06-10',
      body: 'Workspace Goods delivery is planned for June 18.',
    },
    {
      id: 3,
      title: 'New analyst invitation pending',
      channel: 'security',
      severity: 'warning',
      recipientId: 1,
      read: true,
      createdAt: '2026-06-09',
      body: 'Mateo Silva has not completed the invite flow yet.',
    },
  ],
  stock_transfers: [
    {
      id: 1,
      transferNumber: 'TR-2026-001',
      productId: 1,
      fromWarehouseId: 1,
      toWarehouseId: 2,
      quantity: 12,
      status: 'in_transit',
      requestedById: 2,
      requestedDate: '2026-06-10',
      expectedDate: '2026-06-12',
      notes: 'Balance West Hub demo laptop stock before field rollout.',
    },
    {
      id: 2,
      transferNumber: 'TR-2026-002',
      productId: 4,
      fromWarehouseId: 3,
      toWarehouseId: 1,
      quantity: 20,
      status: 'draft',
      requestedById: 3,
      requestedDate: '2026-06-11',
      expectedDate: '2026-06-14',
      notes: 'Move packing supplies near outbound lanes after reorder approval.',
    },
  ],
  cycle_counts: [
    {
      id: 1,
      countNumber: 'CC-2026-001',
      warehouseId: 1,
      ownerId: 2,
      scheduledDate: '2026-06-15',
      status: 'scheduled',
      scope: 'Electronics Aisle',
      expectedItems: 42,
      countedItems: 0,
      varianceItems: 0,
      notes: 'Focus on laptop and mouse bins before monthly close.',
    },
    {
      id: 2,
      countNumber: 'CC-2026-002',
      warehouseId: 3,
      ownerId: 3,
      scheduledDate: '2026-06-13',
      status: 'in_progress',
      scope: 'Packing Supplies',
      expectedItems: 18,
      countedItems: 12,
      varianceItems: 2,
      notes: 'Tape variance is under review after packing line consumption.',
    },
  ],
  inventory_adjustments: [
    {
      id: 1,
      adjustmentNumber: 'ADJ-2026-001',
      productId: 4,
      warehouseId: 3,
      quantityChange: -6,
      reason: 'damage',
      status: 'pending_approval',
      requestedById: 2,
      approvedById: null,
      requestedDate: '2026-06-11',
      notes: 'Damaged tape rolls found during returns bay cleanup.',
    },
    {
      id: 2,
      adjustmentNumber: 'ADJ-2026-002',
      productId: 2,
      warehouseId: 2,
      quantityChange: 2,
      reason: 'cycle_count_variance',
      status: 'approved',
      requestedById: 3,
      approvedById: 1,
      requestedDate: '2026-06-09',
      notes: 'Cycle count found two chairs staged but not scanned.',
    },
  ],
  reorder_rules: [
    {
      id: 1,
      productId: 2,
      warehouseId: 2,
      minStock: 6,
      targetStock: 18,
      reorderQuantity: 14,
      supplierId: 2,
      leadTimeDays: 7,
      status: 'active',
      lastReviewedAt: '2026-06-10',
      notes: 'Chair demand is steady; keep one-week coverage in West Hub.',
    },
    {
      id: 2,
      productId: 4,
      warehouseId: 3,
      minStock: 24,
      targetStock: 72,
      reorderQuantity: 54,
      supplierId: 3,
      leadTimeDays: 5,
      status: 'review',
      lastReviewedAt: '2026-06-11',
      notes: 'Packing line consumption accelerated; analyst review required.',
    },
    {
      id: 3,
      productId: 1,
      warehouseId: 1,
      minStock: 10,
      targetStock: 40,
      reorderQuantity: 20,
      supplierId: 1,
      leadTimeDays: 9,
      status: 'active',
      lastReviewedAt: '2026-06-08',
      notes: 'Laptop stock remains healthy after initial receiving.',
    },
  ],
  crm_accounts: [
    {
      id: 1,
      accountName: 'Helio Manufacturing',
      segment: 'strategic',
      ownerId: 1,
      health: 'healthy',
      annualValue: 184000,
      nextReview: '2026-06-21',
      notes: 'Expansion team is evaluating a second warehouse rollout.',
    },
    {
      id: 2,
      accountName: 'Summit Field Services',
      segment: 'growth',
      ownerId: 3,
      health: 'watch',
      annualValue: 72000,
      nextReview: '2026-06-18',
      notes: 'Needs clearer implementation timeline before procurement review.',
    },
    {
      id: 3,
      accountName: 'Lumen Clinics',
      segment: 'renewal',
      ownerId: 2,
      health: 'at_risk',
      annualValue: 96000,
      nextReview: '2026-06-14',
      notes: 'Renewal depends on resolving mobile receiving workflow concerns.',
    },
  ],
  crm_contacts: [
    {
      id: 1,
      fullName: 'Nina Wallace',
      accountId: 1,
      email: 'nina.wallace@example.com',
      phone: '+1 303 555 0134',
      roleTitle: 'VP Operations',
      influence: 'decision_maker',
      status: 'active',
      lastTouchDate: '2026-06-10',
      notes: 'Prefers short weekly summaries with rollout blockers.',
    },
    {
      id: 2,
      fullName: 'Owen Mercer',
      accountId: 2,
      email: 'owen.mercer@example.com',
      phone: '+1 512 555 0181',
      roleTitle: 'Program Lead',
      influence: 'evaluator',
      status: 'new',
      lastTouchDate: '2026-06-09',
      notes: 'Collecting field team requirements.',
    },
    {
      id: 3,
      fullName: 'Iris Zhao',
      accountId: 3,
      email: 'iris.zhao@example.com',
      phone: '+1 617 555 0198',
      roleTitle: 'Clinic Operations Manager',
      influence: 'operator',
      status: 'active',
      lastTouchDate: '2026-06-07',
      notes: 'Raised barcode scanning latency during renewal review.',
    },
  ],
  crm_deals: [
    {
      id: 1,
      dealName: 'Helio multi-site launch',
      accountId: 1,
      contactId: 1,
      ownerId: 1,
      stage: 'proposal',
      amount: 124000,
      probability: 68,
      closeDate: '2026-07-05',
      nextStep: 'Send revised rollout schedule with staffing plan.',
    },
    {
      id: 2,
      dealName: 'Summit dispatch upgrade',
      accountId: 2,
      contactId: 2,
      ownerId: 3,
      stage: 'discovery',
      amount: 42000,
      probability: 35,
      closeDate: '2026-07-18',
      nextStep: 'Confirm mobile inventory workflow requirements.',
    },
    {
      id: 3,
      dealName: 'Lumen renewal recovery',
      accountId: 3,
      contactId: 3,
      ownerId: 2,
      stage: 'negotiation',
      amount: 88000,
      probability: 54,
      closeDate: '2026-06-28',
      nextStep: 'Share mitigation plan for scanning performance.',
    },
  ],
  crm_activities: [
    {
      id: 1,
      subject: 'Helio rollout review',
      accountId: 1,
      contactId: 1,
      dealId: 1,
      ownerId: 1,
      type: 'review',
      status: 'planned',
      dueDate: '2026-06-13',
      outcome: 'Prepare options for phased deployment.',
    },
    {
      id: 2,
      subject: 'Summit workflow interview',
      accountId: 2,
      contactId: 2,
      dealId: 2,
      ownerId: 3,
      type: 'call',
      status: 'follow_up',
      dueDate: '2026-06-12',
      outcome: 'Need field dispatch sample data before proposal.',
    },
    {
      id: 3,
      subject: 'Lumen renewal checkpoint',
      accountId: 3,
      contactId: 3,
      dealId: 3,
      ownerId: 2,
      type: 'demo',
      status: 'completed',
      dueDate: '2026-06-08',
      outcome: 'Clinic team accepted the corrected scan queue demo.',
    },
  ],
  property_agents: [
    {
      id: 1,
      name: 'Mara Kim',
      email: 'mara.kim@example.com',
      phone: '+1 310 555 0190',
      territory: 'Westside',
      status: 'active',
      capacityScore: 82,
      notes: 'Strong fit for high-touch office tours.',
    },
    {
      id: 2,
      name: 'Theo Grant',
      email: 'theo.grant@example.com',
      phone: '+1 718 555 0127',
      territory: 'Downtown',
      status: 'active',
      capacityScore: 74,
      notes: 'Handles mixed-use portfolio leads.',
    },
    {
      id: 3,
      name: 'Leah Stone',
      email: 'leah.stone@example.com',
      phone: '+1 206 555 0176',
      territory: 'North Corridor',
      status: 'on_leave',
      capacityScore: 38,
      notes: 'Temporarily reroute new showings to Mara or Theo.',
    },
  ],
  properties: [
    {
      id: 1,
      propertyName: 'Harbor View Lofts',
      market: 'San Diego',
      assetType: 'multifamily',
      status: 'listed',
      managerId: 1,
      units: 86,
      occupancy: 91,
      askingPrice: 28400000,
      notes: 'Top-floor units need refreshed photography before weekend tours.',
    },
    {
      id: 2,
      propertyName: 'Cedar Works Campus',
      market: 'Austin',
      assetType: 'office',
      status: 'active',
      managerId: 2,
      units: 12,
      occupancy: 78,
      askingPrice: 19100000,
      notes: 'Tenant expansion inquiries are increasing after lobby renovation.',
    },
    {
      id: 3,
      propertyName: 'Northline Logistics Park',
      market: 'Portland',
      assetType: 'industrial',
      status: 'renovation',
      managerId: 3,
      units: 6,
      occupancy: 64,
      askingPrice: 33600000,
      notes: 'Dock upgrades remain the main pre-listing blocker.',
    },
  ],
  property_leads: [
    {
      id: 1,
      leadName: 'Bright Harbor Group',
      propertyId: 1,
      agentId: 1,
      source: 'referral',
      budget: 29000000,
      status: 'tour_scheduled',
      targetMoveDate: '2026-07-15',
      notes: 'Interested in stable occupancy and rent growth history.',
    },
    {
      id: 2,
      leadName: 'Atlas Product Studio',
      propertyId: 2,
      agentId: 2,
      source: 'portal',
      budget: 18500000,
      status: 'qualified',
      targetMoveDate: '2026-08-01',
      notes: 'Needs a flexible floor plate for hybrid teams.',
    },
    {
      id: 3,
      leadName: 'Greenline Distribution',
      propertyId: 3,
      agentId: 2,
      source: 'partner',
      budget: 31000000,
      status: 'new',
      targetMoveDate: '2026-09-10',
      notes: 'Waiting for updated dock renovation schedule.',
    },
    {
      id: 4,
      leadName: 'Oak & Stone Living',
      propertyId: 1,
      agentId: 1,
      source: 'walk_in',
      budget: 27200000,
      status: 'offer',
      targetMoveDate: '2026-07-03',
      notes: 'Preparing second-round offer after asset review.',
    },
  ],
  property_showings: [
    {
      id: 1,
      showingNumber: 'TOUR-2026-001',
      propertyId: 1,
      leadId: 1,
      agentId: 1,
      scheduledDate: '2026-06-14',
      status: 'scheduled',
      feedbackScore: null,
      notes: 'Show renovated units and amenity deck first.',
    },
    {
      id: 2,
      showingNumber: 'TOUR-2026-002',
      propertyId: 2,
      leadId: 2,
      agentId: 2,
      scheduledDate: '2026-06-16',
      status: 'scheduled',
      feedbackScore: null,
      notes: 'Prepare workspace density comparison.',
    },
    {
      id: 3,
      showingNumber: 'TOUR-2026-003',
      propertyId: 1,
      leadId: 4,
      agentId: 1,
      scheduledDate: '2026-06-08',
      status: 'completed',
      feedbackScore: 9,
      notes: 'Lead requested updated operating expense packet.',
    },
  ],
  mail_inbox: [
    { id: 1, sender: 'ops@example.test', subject: 'Low stock review', body: 'Please review the replenishment queue before noon.', date: '2026-06-12', unread: true },
    { id: 2, sender: 'finance@example.test', subject: 'June order reconciliation', body: 'The order receipt packet is ready for review.', date: '2026-06-11', unread: false },
    { id: 3, sender: 'partner@example.test', subject: 'New warehouse onboarding', body: 'The West Hub onboarding checklist has been updated.', date: '2026-06-10', unread: true },
  ],
  mail_draft: [
    { id: 1, to: 'supplier@example.test', subject: 'PO delivery window', body: 'Can you confirm the expected delivery slot?', updatedAt: '2026-06-12' },
    { id: 2, to: 'team@example.test', subject: 'Weekly operating summary', body: 'Drafting highlights for the Monday standup.', updatedAt: '2026-06-11' },
  ],
  mail_sent: [
    { id: 1, to: 'warehouse@example.test', subject: 'Cycle count packet', body: 'Attached are the count sheets for this week.', sentAt: '2026-06-10' },
    { id: 2, to: 'lead@example.test', subject: 'Tour confirmation', body: 'Your property tour is confirmed for Friday.', sentAt: '2026-06-09' },
  ],
  mail_archive: [
    { id: 1, sender: 'audit@example.test', subject: 'Completed access review', body: 'Quarterly access review has been archived.', date: '2026-05-28', unread: false },
  ],
  mail_snoozed: [
    { id: 1, sender: 'calendar@example.test', subject: 'Follow up on showings', body: 'Reminder scheduled for tomorrow morning.', date: '2026-06-13', unread: true },
  ],
  mail_spam: [
    { id: 1, sender: 'unknown@example.test', subject: 'Unverified vendor offer', body: 'This message was flagged by the demo policy.', date: '2026-06-08', unread: false },
  ],
  mail_trash: [
    { id: 1, sender: 'noreply@example.test', subject: 'Expired notification', body: 'This message was removed from the main inbox.', date: '2026-06-01', unread: false },
  ],
  store_client_products: [
    { id: 1, name: 'Field Laptop Bundle', price: 1499, category: 'Electronics', rating: 4.8, stock: 24 },
    { id: 2, name: 'Ergonomic Work Kit', price: 389, category: 'Furniture', rating: 4.6, stock: 18 },
    { id: 3, name: 'Packing Starter Pack', price: 42, category: 'Office Supplies', rating: 4.3, stock: 72 },
  ],
  store_client_orders: [
    { id: 1, orderNumber: 'WEB-2026-1001', totalAmount: 1499, status: 'processing', orderDate: '2026-06-12' },
    { id: 2, orderNumber: 'WEB-2026-1002', totalAmount: 389, status: 'shipped', orderDate: '2026-06-10' },
    { id: 3, orderNumber: 'WEB-2026-1003', totalAmount: 84, status: 'delivered', orderDate: '2026-06-08' },
  ],
  project_planning: [
    { id: 1, milestone: 'Workspace launch checklist', ownerId: 1, dueDate: '2026-06-21', status: 'in_progress', confidence: 82, notes: 'Finalize sidebar taxonomy and sample data coverage.' },
    { id: 2, milestone: 'Mobile evidence pack', ownerId: 2, dueDate: '2026-06-24', status: 'review', confidence: 76, notes: 'Collect screenshots and smoke logs for five compact routes.' },
    { id: 3, milestone: 'Template handoff notes', ownerId: 3, dueDate: '2026-06-28', status: 'planned', confidence: 68, notes: 'Document which references informed layout, density, and information architecture.' },
  ],
  store_admin: [
    { id: 1, module: 'Catalog moderation', ownerId: 1, status: 'in_progress', targetDate: '2026-07-02', notes: 'Review queue for rich product content and publishing state.' },
    { id: 2, module: 'Promotion rule builder', ownerId: 4, status: 'planned', targetDate: '2026-07-08', notes: 'Create guardrails for coupon stacking and margin review.' },
    { id: 3, module: 'Merchant dashboard', ownerId: 2, status: 'review', targetDate: '2026-07-12', notes: 'Summarize orders, refunds, and fulfillment exceptions.' },
  ],
  store_services: [
    { id: 1, serviceName: 'Checkout orchestration', runtime: 'edge', status: 'planned', latencyBudgetMs: 180, notes: 'Coordinate tax, shipping, and payment preflight checks.' },
    { id: 2, serviceName: 'Inventory reservation queue', runtime: 'queue', status: 'in_progress', latencyBudgetMs: 450, notes: 'Reserve stock during payment authorization windows.' },
    { id: 3, serviceName: 'Notification worker', runtime: 'worker', status: 'review', latencyBudgetMs: 250, notes: 'Send order, invoice, and delivery updates.' },
  ],
  ai_prompt: [
    { id: 1, promptName: 'Developer refactor guide', audience: 'developer', status: 'review', usageCount: 42, content: 'Explain refactor risk, dependencies, and verification steps.' },
    { id: 2, promptName: 'Business launch brief', audience: 'business', status: 'planned', usageCount: 31, content: 'Summarize launch readiness, blockers, and owner commitments.' },
    { id: 3, promptName: 'Creative campaign draft', audience: 'creative', status: 'completed', usageCount: 56, content: 'Generate three campaign angles with operational constraints.' },
  ],
  invoice_generator: [
    { id: 1, templateName: 'Order invoice packet', channel: 'order', status: 'in_progress', nextRunAt: '2026-06-18', notes: 'Generate buyer-facing invoice with shipment detail.' },
    { id: 2, templateName: 'Monthly account statement', channel: 'email', status: 'planned', nextRunAt: '2026-07-01', notes: 'Attach statement summary and open balance snapshot.' },
    { id: 3, templateName: 'System credit memo', channel: 'system', status: 'review', nextRunAt: '2026-06-22', notes: 'Route adjustment approvals before issuing credit memo.' },
  ],
  billing_plans: [
    { id: 1, planName: 'Starter', tier: 'starter', priceMonthly: 19, seatsIncluded: 3, status: 'active', description: 'For small teams getting started with inventory.' },
    { id: 2, planName: 'Pro', tier: 'pro', priceMonthly: 49, seatsIncluded: 10, status: 'active', description: 'Advanced operations, automation, and reporting.' },
    { id: 3, planName: 'Enterprise', tier: 'enterprise', priceMonthly: 149, seatsIncluded: 50, status: 'active', description: 'SSO, audit logs, and dedicated support.' },
    { id: 4, planName: 'Legacy Basic', tier: 'starter', priceMonthly: 9, seatsIncluded: 1, status: 'deprecated', description: 'Grandfathered plan, no longer available.' },
  ],
  billing_invoices: [
    { id: 1, invoiceNumber: 'INV-2026-0001', amount: 49, status: 'paid', issuedDate: '2026-06-01', periodStart: '2026-06-01', periodEnd: '2026-06-30' },
    { id: 2, invoiceNumber: 'INV-2026-0002', amount: 149, status: 'paid', issuedDate: '2026-06-01', periodStart: '2026-06-01', periodEnd: '2026-06-30' },
    { id: 3, invoiceNumber: 'INV-2026-0003', amount: 19, status: 'pending', issuedDate: '2026-06-15', periodStart: '2026-06-15', periodEnd: '2026-07-14' },
    { id: 4, invoiceNumber: 'INV-2026-0004', amount: 49, status: 'failed', issuedDate: '2026-06-10', periodStart: '2026-06-10', periodEnd: '2026-07-09' },
  ],
  billing_subscriptions: [
    { id: 1, subscriber: 'Operations Team', planId: 2, billingCycle: 'monthly', status: 'active', renewsOn: '2026-07-01', notes: 'Primary workspace subscription.' },
    { id: 2, subscriber: 'Warehouse Crew', planId: 1, billingCycle: 'annual', status: 'trialing', renewsOn: '2026-06-25', notes: 'Trial ends before renewal.' },
    { id: 3, subscriber: 'Finance Dept', planId: 3, billingCycle: 'annual', status: 'past_due', renewsOn: '2026-06-05', notes: 'Payment retry scheduled.' },
  ],
  security_sessions: [
    { id: 1, device: 'MacBook Pro', ipAddress: '10.0.1.24', location: 'Shanghai', lastActive: '2026-06-18', status: 'active' },
    { id: 2, device: 'iPhone 15', ipAddress: '114.88.20.3', location: 'Shanghai', lastActive: '2026-06-18', status: 'idle' },
    { id: 3, device: 'Chrome on Windows', ipAddress: '203.0.113.7', location: 'Beijing', lastActive: '2026-06-15', status: 'revoked' },
  ],
  security_devices: [
    { id: 1, deviceName: 'Jordan MacBook', ownerId: 1, platform: 'macos', status: 'trusted', enrolledAt: '2026-01-12', notes: 'Primary work laptop.' },
    { id: 2, deviceName: 'Priya iPhone', ownerId: 2, platform: 'ios', status: 'trusted', enrolledAt: '2026-02-03', notes: 'Authenticator enrolled.' },
    { id: 3, deviceName: 'Unknown Android', ownerId: 4, platform: 'android', status: 'pending', enrolledAt: '2026-06-10', notes: 'Awaiting admin approval.' },
  ],
  security_allowed_ips: [
    { id: 1, cidr: '10.0.0.0/16', label: 'Office HQ', status: 'allowed', addedAt: '2026-01-01', notes: 'Corporate network range.' },
    { id: 2, cidr: '203.0.113.0/24', label: 'VPN egress', status: 'allowed', addedAt: '2026-02-15', notes: 'Remote access VPN pool.' },
    { id: 3, cidr: '198.51.100.42', label: 'Legacy printer', status: 'restricted', addedAt: '2026-03-20', notes: 'Allow only during business hours.' },
  ],
  referral_invites: [
    { id: 1, inviteeEmail: 'mateo@example.com', inviterId: 1, code: 'OPS-2026-A', status: 'accepted', sentAt: '2026-05-10', acceptedAt: '2026-05-12' },
    { id: 2, inviteeEmail: 'evelyn@example.com', inviterId: 2, code: 'OPS-2026-B', status: 'sent', sentAt: '2026-06-01', acceptedAt: '' },
    { id: 3, inviteeEmail: 'carlos@example.com', inviterId: 3, code: 'OPS-2026-C', status: 'expired', sentAt: '2026-04-01', acceptedAt: '' },
  ],
};

let memoryDb = cloneDb(initialDbState);

function cloneDb(db: DbState): DbState {
  return JSON.parse(JSON.stringify(db)) as DbState;
}

function getStorage(): Storage | null {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
}

function normalizeDb(value: unknown): DbState {
  const db = cloneDb(initialDbState);
  if (!value || typeof value !== 'object') return db;

  for (const resource of Object.keys(initialDbState) as ResourceName[]) {
    const records = (value as Partial<DbState>)[resource];
    if (Array.isArray(records)) db[resource] = records;
  }

  return db;
}

function getDb(): DbState {
  const storage = getStorage();
  if (!storage) return memoryDb;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = cloneDb(initialDbState);
      storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return normalizeDb(JSON.parse(raw) as unknown);
  } catch {
    return cloneDb(initialDbState);
  }
}

function saveDb(db: DbState): void {
  const storage = getStorage();
  if (!storage) {
    memoryDb = db;
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // The demo remains usable in memory if browser storage is unavailable.
  }
}

function isResourceName(resource: string): resource is ResourceName {
  return resource in initialDbState;
}

function getResource(db: DbState, resource: string): BaseRecord[] {
  if (!isResourceName(resource)) {
    throw new Error(`Resource ${resource} not found`);
  }
  return db[resource];
}

function isLogicalFilter(filter: Filter): filter is LogicalFilter {
  return (filter.operator === 'or' || filter.operator === 'and') && Array.isArray(filter.value);
}

function compareNullable(value: unknown, target: unknown, compare: (left: number, right: number) => boolean): boolean {
  if (value === null || value === undefined || target === null || target === undefined) return false;
  return compare(Number(value), Number(target));
}

function matchesBetween(value: unknown, target: unknown, negate: boolean): boolean {
  if (!Array.isArray(target) || target.length < 2) return negate;
  const numberValue = Number(value);
  const lower = Number(target[0]);
  const upper = Number(target[1]);
  const inRange = numberValue >= lower && numberValue <= upper;
  return negate ? !inRange : inRange;
}

function matchesFieldFilter(item: BaseRecord, filter: FieldFilter): boolean {
  const value = item[filter.field];
  const target = filter.value;

  switch (filter.operator) {
    case 'eq':
      return String(value) === String(target);
    case 'ne':
      return String(value) !== String(target);
    case 'lt':
      return compareNullable(value, target, (left, right) => left < right);
    case 'gt':
      return compareNullable(value, target, (left, right) => left > right);
    case 'lte':
      return compareNullable(value, target, (left, right) => left <= right);
    case 'gte':
      return compareNullable(value, target, (left, right) => left >= right);
    case 'contains':
      return String(value ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
    case 'ncontains':
      return !String(value ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
    case 'startswith':
      return String(value ?? '').toLowerCase().startsWith(String(target ?? '').toLowerCase());
    case 'endswith':
      return String(value ?? '').toLowerCase().endsWith(String(target ?? '').toLowerCase());
    case 'in':
      return Array.isArray(target) && target.map(String).includes(String(value));
    case 'nin':
      return Array.isArray(target) && !target.map(String).includes(String(value));
    case 'null':
      return value === null || value === undefined;
    case 'nnull':
      return value !== null && value !== undefined;
    case 'between':
      return matchesBetween(value, target, false);
    case 'nbetween':
      return matchesBetween(value, target, true);
  }
}

function matchesFilter(item: BaseRecord, filter: Filter): boolean {
  if (isLogicalFilter(filter)) {
    return filter.operator === 'and'
      ? filter.value.every((child) => matchesFilter(item, child))
      : filter.value.some((child) => matchesFilter(item, child));
  }

  return matchesFieldFilter(item, filter);
}

function applyFilters(items: BaseRecord[], filters?: Filter[]): BaseRecord[] {
  if (!filters?.length) return items;
  return items.filter((item) => filters.every((filter) => matchesFilter(item, filter)));
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

function applySorters(items: BaseRecord[], sorters?: Sort[]): BaseRecord[] {
  if (!sorters?.length) return items;

  return [...items].sort((a, b) => {
    for (const sorter of sorters) {
      const comparison = compareValues(a[sorter.field], b[sorter.field]);
      if (comparison !== 0) return sorter.order === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
}

function applyPagination(items: BaseRecord[], pagination?: Pagination): { data: BaseRecord[]; total: number } {
  if (!pagination || pagination.mode === 'off') {
    return { data: items, total: items.length };
  }

  const current = pagination.current ?? 1;
  const pageSize = pagination.pageSize ?? 10;
  const start = (current - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
  };
}

function toVariablesRecord<TVariables>(variables: TVariables): Record<string, unknown> {
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) return {};
  return variables as Record<string, unknown>;
}

function getNextId(records: BaseRecord[]): number {
  return records.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1;
}

function updateOneRecord<TVariables>(db: DbState, resourceName: string, id: string | number, variables: TVariables): BaseRecord {
  const resource = getResource(db, resourceName);
  const index = resource.findIndex((record) => String(record.id) === String(id));
  if (index === -1) {
    throw new Error(`Item ${id} not found in ${resourceName}`);
  }

  const updated: BaseRecord = {
    ...resource[index],
    ...toVariablesRecord(variables),
    id: resource[index].id,
  };

  resource[index] = updated;
  return updated;
}

function deleteOneRecord(db: DbState, resourceName: string, id: string | number): BaseRecord {
  const resource = getResource(db, resourceName);
  const index = resource.findIndex((record) => String(record.id) === String(id));
  if (index === -1) {
    throw new Error(`Item ${id} not found in ${resourceName}`);
  }

  const [deleted] = resource.splice(index, 1);
  return deleted;
}

export const inMemoryDataProvider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> => {
    const db = getDb();
    const resource = getResource(db, params.resource);
    const filtered = applyFilters([...resource], params.filters);
    const sorted = applySorters(filtered, params.sorters);
    const { data, total } = applyPagination(sorted, params.pagination);

    return { data: data as TData[], total };
  },

  getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> => {
    const item = getResource(getDb(), params.resource).find((record) => String(record.id) === String(params.id));
    if (!item) {
      throw new Error(`Item ${params.id} not found in ${params.resource}`);
    }
    return { data: item as TData };
  },

  getMany: async <TData extends BaseRecord = BaseRecord>(params: GetManyParams): Promise<GetManyResult<TData>> => {
    const ids = params.ids.map(String);
    const data = getResource(getDb(), params.resource).filter((record) => ids.includes(String(record.id)));
    return { data: data as TData[] };
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: CreateParams<TVariables>,
  ): Promise<CreateResult<TData>> => {
    const db = getDb();
    const resource = getResource(db, params.resource);
    const created: BaseRecord = {
      ...toVariablesRecord(params.variables),
      id: getNextId(resource),
    };

    resource.push(created);
    saveDb(db);
    return { data: created as TData };
  },

  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: CreateManyParams<TVariables>,
  ): Promise<CreateManyResult<TData>> => {
    const db = getDb();
    const resource = getResource(db, params.resource);
    const created = params.variables.map((variables) => {
      const record: BaseRecord = {
        ...toVariablesRecord(variables),
        id: getNextId(resource),
      };
      resource.push(record);
      return record;
    });

    saveDb(db);
    return { data: created as TData[] };
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: UpdateParams<TVariables>,
  ): Promise<UpdateResult<TData>> => {
    const db = getDb();
    const updated = updateOneRecord(db, params.resource, params.id, params.variables);
    saveDb(db);
    return { data: updated as TData };
  },

  updateMany: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: UpdateManyParams<TVariables>,
  ): Promise<UpdateManyResult<TData>> => {
    const db = getDb();
    const updated = params.ids.map((id) => updateOneRecord(db, params.resource, id, params.variables));
    saveDb(db);
    return { data: updated as TData[] };
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: DeleteParams<TVariables>,
  ): Promise<DeleteResult<TData>> => {
    const db = getDb();
    const deleted = deleteOneRecord(db, params.resource, params.id);
    saveDb(db);
    return { data: deleted as TData };
  },

  deleteMany: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: DeleteManyParams<TVariables>,
  ): Promise<DeleteManyResult<TData>> => {
    const db = getDb();
    const deleted = params.ids.map((id) => deleteOneRecord(db, params.resource, id));
    saveDb(db);
    return { data: deleted as TData[] };
  },

  getApiUrl: () => 'in-memory://inventory-demo',
};
