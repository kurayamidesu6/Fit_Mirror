import { supabase } from './supabaseClient';

const parseSort = (sortStr) => {
  if (!sortStr) return { column: 'created_date', ascending: false };
  const ascending = !sortStr.startsWith('-');
  const column = sortStr.replace(/^-/, '');
  return { column, ascending };
};

const createEntity = (tableName) => ({
  list: async (sort = '-created_date', limit = 50) => {
    const { column, ascending } = parseSort(sort);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(column, { ascending })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  filter: async (filters = {}, sort = '-created_date', limit = 50) => {
    const { column, ascending } = parseSort(sort);
    let query = supabase.from(tableName).select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query.order(column, { ascending }).limit(limit);
    if (error) throw error;
    return data || [];
  },

  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = user ? { ...data, user_id: user.id } : data;
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  bulkCreate: async (items) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(items)
      .select();
    if (error) throw error;
    return result;
  },

  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  deleteWhere: async (filters = {}) => {
    let query = supabase.from(tableName).delete();
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { error } = await query;
    if (error) throw error;
  },
});

export const entities = {
  Workout: createEntity('workouts'),
  Attempt: createEntity('attempts'),
  Challenge: createEntity('challenges'),
  SavedWorkout: createEntity('saved_workouts'),
};
