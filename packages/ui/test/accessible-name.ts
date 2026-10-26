function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 仅测试使用：以字面字符串严格匹配 accessible name。
export function exactRoleName(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)}$`);
}
