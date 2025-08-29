import { supabase, User, UserWithLocation } from '../lib/supabase';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          location:locations(id, locationname, address)
        `)
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('password', password)
        .single();

      if (error) {
        console.error('Login error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  static async getUserById(id: string): Promise<UserWithLocation | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          location:locations(id, locationname, address)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Get user error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  static async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          location:locations(id, locationname, address)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get users error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  }

  static async getAdminsByLocation(locationId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          location:locations(id, locationname, address)
        `)
        .eq('role', 'admin')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get admins by location error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get admins by location error:', error);
      return [];
    }
  }

  static async createUser(userData: {
    username: string;
    password: string;
    role: 'owner' | 'admin';
    location_id?: string;
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select(`
          *,
          location:locations(id, locationname, address)
        `)
        .single();

      if (error) {
        console.error('Create user error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create user error:', error);
      return null;
    }
  }

  static async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', id)
        .select(`
          *,
          location:locations(id, locationname, address)
        `)
        .single();

      if (error) {
        console.error('Update user error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Update user error:', error);
      return null;
    }
  }

  static async deleteUser(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete user error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }

  static async changePassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', id);

      if (error) {
        console.error('Change password error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }
}