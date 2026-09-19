import { describe, expect, it } from 'bun:test';
import { generateResourceBundle } from '@svadmin/core/inferencer';
import { parseManualFields } from './generate-command';

describe('manual temporal field contracts', () => {
  it('preserves all three temporal types and the primary key requirement', () => {
    expect(parseManualFields('id:number,startsAt:datetime,alarm:time,period:daterange', 'id')).toEqual([
      { key: 'id', label: 'Id', type: 'number', required: true },
      { key: 'startsAt', label: 'StartsAt', type: 'datetime', required: false },
      { key: 'alarm', label: 'Alarm', type: 'time', required: false },
      { key: 'period', label: 'Period', type: 'daterange', required: false },
    ]);
    expect(() => parseManualFields('period:date-range', 'id')).toThrow('Invalid field type');
  });

  it('generates local clock strings and a nullable two-endpoint range, not a scalar range', () => {
    const bundle = generateResourceBundle({
      name: 'events', primaryKey: 'id',
      fields: parseManualFields('id:number,startsAt:datetime,alarm:time,period:daterange', 'id'),
    });
    expect(bundle.typeboxCode).toContain('startsAt: Type.Optional(Type.String())');
    expect(bundle.typeboxCode).toContain('alarm: Type.Optional(Type.String())');
    expect(bundle.typeboxCode).toContain('period: Type.Optional(Type.Union([Type.Object({ start: Type.Union([Type.String(), Type.Null()]), end: Type.Union([Type.String(), Type.Null()]) }, { additionalProperties: false }), Type.Null()]))');
    expect(bundle.typeboxCode).not.toContain("format: 'date-time'");
  });
});
