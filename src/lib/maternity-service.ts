import { supabase } from '@/integrations/supabase/client';
import type { MaternityMonthlyRecord, MaternityActionPlan } from './maternity-types';

export async function getMaternityRecord(params: {
  hospitalId: string;
  sectorId?: string | null;
  month: number;
  year: number;
}): Promise<MaternityMonthlyRecord | null> {
  let query = supabase
    .from('maternity_monthly_records')
    .select('*')
    .eq('hospital_id', params.hospitalId)
    .eq('month', params.month)
    .eq('year', params.year);

  if (params.sectorId) {
    query = query.eq('sector_id', params.sectorId);
  } else {
    query = query.is('sector_id', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as MaternityMonthlyRecord | null;
}

export async function upsertMaternityRecord(record: MaternityMonthlyRecord): Promise<MaternityMonthlyRecord> {
  const { id, created_at, updated_at, ...payload } = record as any;
  const { data, error } = await supabase
    .from('maternity_monthly_records')
    .upsert(id ? { id, ...payload } : payload, { onConflict: 'hospital_id,sector_id,month,year' })
    .select('*')
    .single();

  if (error) throw error;
  return data as MaternityMonthlyRecord;
}

export async function listMaternityRecords(hospitalId: string, year: number): Promise<MaternityMonthlyRecord[]> {
  const { data, error } = await supabase
    .from('maternity_monthly_records')
    .select('*')
    .eq('hospital_id', hospitalId)
    .eq('year', year)
    .order('month', { ascending: true });

  if (error) throw error;
  return (data || []) as MaternityMonthlyRecord[];
}

export async function isMaternityModuleInstalled(hospitalId: string): Promise<boolean> {
  const { data } = await supabase
    .from('hospital_tool_installations')
    .select('tool_id')
    .eq('hospital_id', hospitalId)
    .eq('tool_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

export async function listMaternityActionPlans(hospitalId: string, recordId?: string): Promise<MaternityActionPlan[]> {
  let query = supabase
    .from('maternity_action_plans')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: false });

  if (recordId) query = query.eq('monthly_record_id', recordId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MaternityActionPlan[];
}

export async function upsertMaternityActionPlan(plan: MaternityActionPlan): Promise<MaternityActionPlan> {
  const { id, created_at, updated_at, ...payload } = plan as any;
  const { data, error } = await supabase
    .from('maternity_action_plans')
    .upsert(id ? { id, ...payload } : payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as MaternityActionPlan;
}

export async function deleteMaternityActionPlan(id: string): Promise<void> {
  const { error } = await supabase.from('maternity_action_plans').delete().eq('id', id);
  if (error) throw error;
}
